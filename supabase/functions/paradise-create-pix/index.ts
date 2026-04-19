import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PARADISE_URL = "https://multi.paradisepags.com/api/v1/transaction.php";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("PARADISE_API_KEY");
    if (!apiKey) throw new Error("PARADISE_API_KEY não configurada");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const body = await req.json();
    const { purchase_type, model_id, fee_id, parent_order_id } = body as {
      purchase_type: "vip_global" | "model_subscription" | "access_fee";
      model_id?: string;
      fee_id?: string;
      parent_order_id?: string;
    };

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email, is_banned")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.is_banned) throw new Error("Conta suspensa");

    let amountReais = 0;
    let durationDays = 30;
    let description = "Acesso";
    let orderId: string;

    if (purchase_type === "access_fee") {
      if (!fee_id) throw new Error("fee_id obrigatório");
      // Lookup fee
      const { data: fee } = await supabase
        .from("access_fees")
        .select("id, name, amount, is_active")
        .eq("id", fee_id)
        .maybeSingle();
      if (!fee || !fee.is_active) throw new Error("Taxa não encontrada ou inativa");

      // Already paid?
      const { data: paid } = await supabase
        .from("user_fee_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("fee_id", fee_id)
        .maybeSingle();
      if (paid) throw new Error("Taxa já paga");

      // Reuse existing pending order for this fee or create new
      const { data: existing } = await supabase
        .from("orders")
        .select("id, amount, gateway_transaction_id, gateway_metadata")
        .eq("user_id", user.id)
        .eq("fee_id", fee_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      amountReais = Number(fee.amount);
      durationDays = 0;
      description = fee.name;

      if (existing) {
        orderId = existing.id;
      } else {
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            purchase_type: "access_fee",
            fee_id,
            parent_order_id: parent_order_id ?? null,
            amount: amountReais,
            status: "pending",
            duration_days: 0,
            payment_gateway: "paradise",
          })
          .select()
          .single();
        if (orderErr) throw orderErr;
        orderId = order.id;
      }
    } else {
      if (purchase_type === "vip_global") {
        const { data: s } = await supabase.from("site_settings").select("vip_monthly_price, vip_duration_days").limit(1).maybeSingle();
        amountReais = Number(s?.vip_monthly_price ?? 49.9);
        durationDays = s?.vip_duration_days ?? 30;
        description = "Acesso VIP";
      } else if (purchase_type === "model_subscription" && model_id) {
        const { data: m } = await supabase.from("models").select("monthly_price, name").eq("id", model_id).maybeSingle();
        if (!m) throw new Error("Modelo não encontrado");
        amountReais = Number(m.monthly_price);
        description = `Assinatura ${m.name}`;
      } else {
        throw new Error("purchase_type inválido");
      }

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          purchase_type,
          model_id: model_id ?? null,
          amount: amountReais,
          status: "pending",
          duration_days: durationDays,
          payment_gateway: "paradise",
        })
        .select()
        .single();
      if (orderErr) throw orderErr;
      orderId = order.id;
    }

    const amountCents = Math.round(amountReais * 100);
    const postbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/paradise-webhook`;

    const payload = {
      amount: amountCents,
      description,
      reference: orderId,
      source: "api_externa",
      postback_url: postbackUrl,
      customer: {
        name: profile?.display_name || user.email?.split("@")[0] || "Cliente",
        email: profile?.email || user.email || "cliente@exemplo.com",
        document: "00000000000",
        phone: "11999999999",
      },
    };

    const res = await fetch(PARADISE_URL, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.status !== "success") {
      console.error("Paradise error:", data);
      throw new Error(data.message || "Erro ao gerar PIX");
    }

    await supabase.from("orders").update({
      gateway_transaction_id: String(data.transaction_id),
      gateway_metadata: data,
    }).eq("id", orderId);

    return new Response(
      JSON.stringify({
        order_id: orderId,
        transaction_id: data.transaction_id,
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        amount: data.amount,
        expires_at: data.expires_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
