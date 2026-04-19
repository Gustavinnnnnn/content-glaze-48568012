// Telegram bot edge function — supports webhook + actions
// Public endpoint (no JWT) so Telegram can POST updates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

const FUNCTION_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-bot`;
const TG = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

async function tg(token: string, method: string, body?: any) {
  const res = await fetch(TG(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || res.status}`);
  return data.result;
}

function buildMenuKeyboard(miniAppUrl: string | null, vipLink: string | null) {
  const rows: any[] = [];
  if (miniAppUrl) {
    const base = miniAppUrl.replace(/#.*$/, "").replace(/\/$/, "");
    rows.push([{ text: "🎬 Conteúdos", web_app: { url: `${base}/#explore` } }]);
    rows.push([{ text: "🔥 Modelos", web_app: { url: `${base}/#models` } }]);
    rows.push([{ text: "👑 Acesso VIP", web_app: { url: `${base}/#vip` } }]);
  }
  if (vipLink) {
    rows.push([{ text: "📢 Canal VIP", url: vipLink }]);
  }
  if (rows.length === 0) return undefined;
  return { inline_keyboard: rows };
}

function fmtNew(eventType: string, p: any): string {
  if (eventType === "new_sale") return `💰 <b>Nova venda!</b>\nValor: ${p.currency || "BRL"} ${Number(p.amount).toFixed(2)}\nTipo: ${p.purchase_type === "vip_global" ? "VIP" : "Assinatura"}\nPedido: <code>${p.order_id}</code>`;
  if (eventType === "new_vip") return `👑 <b>Novo VIP!</b>\nUsuário: <code>${p.user_id}</code>\nPedido: <code>${p.order_id}</code>`;
  if (eventType === "new_user") return `🆕 <b>Novo cadastro</b>\nNome: ${p.display_name || "—"}\nEmail: ${p.email || "—"}`;
  return `🔔 ${eventType}\n${JSON.stringify(p)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const isWebhook = url.searchParams.get("mode") === "webhook";

    const { data: cfg, error: cfgErr } = await supabase
      .from("telegram_config").select("*").eq("id", 1).single();
    if (cfgErr) throw cfgErr;

    // ---------------- WEBHOOK MODE (called by Telegram) ----------------
    if (isWebhook) {
      const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
      if (!cfg.webhook_secret || secretHeader !== cfg.webhook_secret) {
        return new Response("forbidden", { status: 403 });
      }
      if (!cfg.bot_token || !cfg.is_active) return new Response("ok");

      const update = await req.json().catch(() => null);
      if (!update?.message) return new Response("ok");

      const m = update.message;
      const chat = m.chat;
      const from = m.from || {};

      // upsert user
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

      // store incoming
      await supabase.from("telegram_messages").upsert(
        {
          update_id: update.update_id,
          chat_id: chat.id,
          message_id: m.message_id,
          direction: "incoming",
          text: m.text || null,
          raw: update,
        },
        { onConflict: "update_id" }
      );

      // commands
      const text = (m.text || "").trim();
      if (text === "/start" || text === "/menu" || text === "/help") {
        const keyboard = buildMenuKeyboard(cfg.mini_app_url, cfg.vip_channel_invite_link);
        const welcome = cfg.welcome_message || "Olá! Bem-vindo.";
        try {
          const sent = await tg(cfg.bot_token, "sendMessage", {
            chat_id: chat.id,
            text: welcome,
            parse_mode: "HTML",
            reply_markup: keyboard,
          });
          await supabase.from("telegram_messages").insert({
            chat_id: chat.id,
            message_id: sent.message_id,
            direction: "outgoing",
            text: welcome,
            raw: sent,
          });
        } catch (e) { console.error("auto-reply", e); }
      }

      return new Response("ok", { headers: corsHeaders });
    }

    // ---------------- ADMIN ACTIONS ----------------
    const body = await req.json().catch(() => ({} as any));
    const { action, token: explicitToken, mini_app_url } = body;
    if (!action) throw new Error("action é obrigatória");

    // VERIFY: validate token, save bot info, set webhook automatically
    if (action === "verify") {
      const token = explicitToken;
      if (!token) throw new Error("Token não fornecido");
      const me = await tg(token, "getMe");

      let secret = cfg.webhook_secret;
      if (!secret) {
        secret = crypto.randomUUID().replace(/-/g, "");
      }

      const finalMiniApp = mini_app_url || cfg.mini_app_url || null;

      await supabase.from("telegram_config").update({
        bot_token: token,
        bot_username: me.username,
        bot_name: me.first_name,
        is_active: true,
        webhook_secret: secret,
        mini_app_url: finalMiniApp,
      }).eq("id", 1);

      // register webhook
      const webhookUrl = `${FUNCTION_URL}?mode=webhook`;
      try {
        await tg(token, "setWebhook", {
          url: webhookUrl,
          secret_token: secret,
          allowed_updates: ["message"],
          drop_pending_updates: true,
        });
      } catch (e: any) {
        console.error("setWebhook failed", e);
        return new Response(JSON.stringify({ ok: false, error: `Bot conectado mas webhook falhou: ${e.message}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // set bot commands menu
      try {
        await tg(token, "setMyCommands", {
          commands: [
            { command: "start", description: "Abrir menu principal" },
            { command: "menu", description: "Mostrar menu" },
          ],
        });
      } catch {}

      return new Response(JSON.stringify({ ok: true, bot: me, webhook: webhookUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!cfg.bot_token) throw new Error("Bot não configurado");

    // SEND
    if (action === "send") {
      const { chat_id, text } = body;
      if (!chat_id || !text) throw new Error("chat_id e text obrigatórios");
      const keyboard = buildMenuKeyboard(cfg.mini_app_url, cfg.vip_channel_invite_link);
      const sent = await tg(cfg.bot_token, "sendMessage", {
        chat_id, text, parse_mode: "HTML", reply_markup: keyboard,
      });
      await supabase.from("telegram_messages").insert({
        chat_id, message_id: sent.message_id, direction: "outgoing", text, raw: sent,
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PROCESS NOTIFICATIONS
    if (action === "process_notifications") {
      const adminIds: number[] = Array.isArray(cfg.admin_chat_ids) ? cfg.admin_chat_ids : [];
      if (!adminIds.length) {
        return new Response(JSON.stringify({ ok: true, processed: 0, reason: "no admins" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: pending } = await supabase
        .from("telegram_notifications").select("*")
        .eq("status", "pending").order("created_at").limit(20);
      let sent = 0;
      for (const n of pending || []) {
        const text = fmtNew(n.event_type, n.payload);
        try {
          for (const adminId of adminIds) {
            await tg(cfg.bot_token, "sendMessage", { chat_id: adminId, text, parse_mode: "HTML" });
          }
          await supabase.from("telegram_notifications")
            .update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", n.id);
          sent++;
        } catch (e: any) {
          await supabase.from("telegram_notifications")
            .update({ status: "failed", error: e.message }).eq("id", n.id);
        }
      }
      return new Response(JSON.stringify({ ok: true, processed: sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // WEBHOOK INFO
    if (action === "webhook_info") {
      const info = await tg(cfg.bot_token, "getWebhookInfo");
      return new Response(JSON.stringify({ ok: true, info }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RE-REGISTER WEBHOOK (after changing mini_app_url etc)
    if (action === "refresh_webhook") {
      const webhookUrl = `${FUNCTION_URL}?mode=webhook`;
      await tg(cfg.bot_token, "setWebhook", {
        url: webhookUrl, secret_token: cfg.webhook_secret,
        allowed_updates: ["message"], drop_pending_updates: false,
      });
      return new Response(JSON.stringify({ ok: true, webhook: webhookUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DISCONNECT
    if (action === "disconnect") {
      try { await tg(cfg.bot_token, "deleteWebhook", { drop_pending_updates: true }); } catch {}
      await supabase.from("telegram_config").update({
        bot_token: null, bot_username: null, bot_name: null, is_active: false,
      }).eq("id", 1);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (e: any) {
    console.error("telegram-bot error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
