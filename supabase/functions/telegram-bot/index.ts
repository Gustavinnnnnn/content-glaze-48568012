// Unified Telegram bot edge function
// Actions: verify | poll | send | process_notifications
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TG = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

async function tg(token: string, method: string, body?: any) {
  const res = await fetch(TG(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description || res.status}`);
  return data.result;
}

function fmtNew(eventType: string, p: any): string {
  if (eventType === "new_sale") {
    return `💰 <b>Nova venda!</b>\nValor: ${p.currency || "BRL"} ${Number(p.amount).toFixed(2)}\nTipo: ${p.purchase_type === "vip_global" ? "VIP" : "Assinatura"}\nPedido: <code>${p.order_id}</code>`;
  }
  if (eventType === "new_vip") {
    return `👑 <b>Novo VIP!</b>\nUsuário: <code>${p.user_id}</code>\nPedido: <code>${p.order_id}</code>`;
  }
  if (eventType === "new_user") {
    return `🆕 <b>Novo cadastro</b>\nNome: ${p.display_name || "—"}\nEmail: ${p.email || "—"}`;
  }
  return `🔔 ${eventType}\n${JSON.stringify(p)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { action, token: explicitToken } = await req.json().catch(() => ({}));
    if (!action) throw new Error("action is required");

    const { data: cfg, error: cfgErr } = await supabase
      .from("telegram_config")
      .select("*")
      .eq("id", 1)
      .single();
    if (cfgErr) throw cfgErr;

    const token = explicitToken || cfg.bot_token;

    // ---- VERIFY: validate token + fetch bot info ----
    if (action === "verify") {
      if (!token) throw new Error("Token não fornecido");
      const me = await tg(token, "getMe");
      await supabase
        .from("telegram_config")
        .update({
          bot_token: token,
          bot_username: me.username,
          bot_name: me.first_name,
          is_active: true,
        })
        .eq("id", 1);
      return new Response(JSON.stringify({ ok: true, bot: me }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!token) throw new Error("Bot não configurado");

    // ---- SEND: send a message to a chat ----
    if (action === "send") {
      const { chat_id, text, parse_mode = "HTML" } = await req.clone().json();
      if (!chat_id || !text) throw new Error("chat_id e text obrigatórios");
      const sent = await tg(token, "sendMessage", { chat_id, text, parse_mode });
      await supabase.from("telegram_messages").insert({
        chat_id,
        message_id: sent.message_id,
        direction: "outgoing",
        text,
        raw: sent,
      });
      return new Response(JSON.stringify({ ok: true, sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- POLL: getUpdates and store incoming messages ----
    if (action === "poll") {
      const updates = await tg(token, "getUpdates", {
        offset: cfg.update_offset,
        timeout: 0,
        allowed_updates: ["message"],
      });
      let processed = 0;
      let newOffset = cfg.update_offset;
      for (const u of updates) {
        if (u.update_id >= newOffset) newOffset = u.update_id + 1;
        if (!u.message) continue;
        const m = u.message;
        const chat = m.chat;
        const from = m.from || {};

        // upsert telegram_user
        await supabase.from("telegram_users").upsert(
          {
            chat_id: chat.id,
            telegram_user_id: from.id,
            username: from.username,
            first_name: from.first_name,
            last_name: from.last_name,
            last_interaction_at: new Date().toISOString(),
          },
          { onConflict: "chat_id" }
        );

        // store message
        await supabase.from("telegram_messages").upsert(
          {
            update_id: u.update_id,
            chat_id: chat.id,
            message_id: m.message_id,
            direction: "incoming",
            text: m.text || null,
            raw: u,
          },
          { onConflict: "update_id" }
        );

        // auto-reply: /start
        if (m.text === "/start") {
          const welcome = cfg.welcome_message || "Olá!";
          try {
            const sent = await tg(token, "sendMessage", { chat_id: chat.id, text: welcome });
            await supabase.from("telegram_messages").insert({
              chat_id: chat.id,
              message_id: sent.message_id,
              direction: "outgoing",
              text: welcome,
              raw: sent,
            });
          } catch (e) { console.error("auto-reply failed", e); }
        }

        processed++;
      }
      await supabase
        .from("telegram_config")
        .update({ update_offset: newOffset, last_polled_at: new Date().toISOString() })
        .eq("id", 1);
      return new Response(JSON.stringify({ ok: true, processed, newOffset }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- PROCESS_NOTIFICATIONS: send queued notifications to admin chats ----
    if (action === "process_notifications") {
      const adminIds: number[] = Array.isArray(cfg.admin_chat_ids) ? cfg.admin_chat_ids : [];
      if (adminIds.length === 0) {
        return new Response(JSON.stringify({ ok: true, processed: 0, reason: "no admins" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: pending } = await supabase
        .from("telegram_notifications")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(20);

      let sent = 0;
      for (const n of pending || []) {
        const text = fmtNew(n.event_type, n.payload);
        try {
          for (const adminId of adminIds) {
            await tg(token, "sendMessage", { chat_id: adminId, text, parse_mode: "HTML" });
          }
          await supabase
            .from("telegram_notifications")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", n.id);
          sent++;
        } catch (e: any) {
          await supabase
            .from("telegram_notifications")
            .update({ status: "failed", error: e.message })
            .eq("id", n.id);
        }
      }
      return new Response(JSON.stringify({ ok: true, processed: sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (e: any) {
    console.error("telegram-bot error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
