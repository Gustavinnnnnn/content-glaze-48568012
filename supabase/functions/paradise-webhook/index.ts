import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    console.log("Paradise webhook:", JSON.stringify(body));

    const externalId = body.external_id || body.reference;
    const status = body.status;
    const transactionId = body.transaction_id;

    if (!externalId && !transactionId) {
      return new Response(JSON.stringify({ ok: false, error: "missing reference" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let q = supabase.from("orders").select("*");
    if (externalId) q = q.eq("id", externalId);
    else q = q.eq("gateway_transaction_id", String(transactionId));
    const { data: order } = await q.maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const map: Record<string, string> = {
      approved: "paid",
      pending: "pending",
      processing: "pending",
      under_review: "pending",
      failed: "cancelled",
      refunded: "refunded",
      chargeback: "refunded",
    };
    const newStatus = map[status] ?? "pending";

    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "paid" && !order.paid_at) update.paid_at = new Date().toISOString();
    await supabase.from("orders").update(update).eq("id", order.id);

    if (newStatus === "paid" && order.status !== "paid") {
      if (order.purchase_type === "access_fee" && order.fee_id) {
        // Mark this fee as paid for the user (idempotent via UNIQUE)
        await supabase.from("user_fee_progress").upsert(
          {
            user_id: order.user_id,
            fee_id: order.fee_id,
            order_id: order.id,
            paid_at: new Date().toISOString(),
          },
          { onConflict: "user_id,fee_id" },
        );

        // Check if all active fees are paid
        const { data: pending } = await supabase.rpc("next_pending_fee", { _user_id: order.user_id });
        const allPaid = !pending || pending.length === 0;

        if (allPaid && order.parent_order_id) {
          const { data: parent } = await supabase
            .from("orders")
            .select("*")
            .eq("id", order.parent_order_id)
            .maybeSingle();
          if (parent && parent.status === "paid") {
            const expires = new Date();
            expires.setDate(expires.getDate() + (parent.duration_days ?? 30));
            if (parent.purchase_type === "vip_global") {
              await supabase.from("vip_subscriptions").insert({
                user_id: parent.user_id,
                expires_at: expires.toISOString(),
              });
            } else if (parent.purchase_type === "model_subscription" && parent.model_id) {
              await supabase.from("model_subscriptions").insert({
                user_id: parent.user_id,
                model_id: parent.model_id,
                expires_at: expires.toISOString(),
              });
            }
          }
        }
      } else if (order.purchase_type === "vip_global" || order.purchase_type === "model_subscription") {
        // Main purchase paid — check pending fees
        const { data: pending } = await supabase.rpc("next_pending_fee", { _user_id: order.user_id });
        const hasFees = pending && pending.length > 0;

        if (!hasFees) {
          // No fees configured → activate immediately
          const expires = new Date();
          expires.setDate(expires.getDate() + (order.duration_days ?? 30));
          if (order.purchase_type === "vip_global") {
            await supabase.from("vip_subscriptions").insert({
              user_id: order.user_id,
              expires_at: expires.toISOString(),
            });
          } else if (order.purchase_type === "model_subscription" && order.model_id) {
            await supabase.from("model_subscriptions").insert({
              user_id: order.user_id,
              model_id: order.model_id,
              expires_at: expires.toISOString(),
            });
          }
        }
        // If hasFees, frontend will guide user through paying each fee.
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
