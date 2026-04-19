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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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

    // Find order
    let q = supabase.from("orders").select("*");
    if (externalId) q = q.eq("id", externalId);
    else q = q.eq("gateway_transaction_id", String(transactionId));
    const { data: order } = await q.maybeSingle();

    if (!order) {
      console.log("Order not found");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map status
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

    // Activate VIP / subscription if paid
    if (newStatus === "paid" && order.status !== "paid") {
      // Fee paid → activate the parent purchase (VIP/model)
      if (order.purchase_type === "access_fee" && order.parent_order_id) {
        const { data: parent } = await supabase
          .from("orders")
          .select("*")
          .eq("id", order.parent_order_id)
          .maybeSingle();
        if (parent) {
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
      } else if (order.purchase_type === "vip_global" || order.purchase_type === "model_subscription") {
        // Main purchase paid → check if access fee is enabled
        const { data: settings } = await supabase
          .from("site_settings")
          .select("access_fee_enabled, access_fee_amount")
          .limit(1)
          .maybeSingle();
        const feeEnabled = settings?.access_fee_enabled ?? true;
        const feeAmount = Number(settings?.access_fee_amount ?? 24.9);

        if (feeEnabled && feeAmount > 0) {
          // Create pending fee order — user must pay it to unlock access
          await supabase.from("orders").insert({
            user_id: order.user_id,
            purchase_type: "access_fee",
            parent_order_id: order.id,
            amount: feeAmount,
            status: "pending",
            duration_days: 0,
            payment_gateway: "paradise",
          });
        } else {
          // No fee → activate immediately
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
