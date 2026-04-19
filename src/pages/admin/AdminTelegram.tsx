import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bot, CheckCircle2, XCircle, RefreshCw, Send, Plus, Trash2, MessageSquare, Bell, ExternalLink } from "lucide-react";

type Cfg = {
  id: number;
  bot_token: string | null;
  bot_username: string | null;
  bot_name: string | null;
  is_active: boolean;
  vip_channel_id: string | null;
  vip_channel_invite_link: string | null;
  welcome_message: string | null;
  vip_welcome_message: string | null;
  notify_on_new_sale: boolean;
  notify_on_new_user: boolean;
  notify_on_new_vip: boolean;
  admin_chat_ids: any;
  mini_app_url: string | null;
  last_polled_at: string | null;
};

const DEFAULT_SITE_URL = typeof window !== "undefined" ? window.location.origin : "";

const AdminTelegram = () => {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState("");
  const [miniAppInput, setMiniAppInput] = useState(DEFAULT_SITE_URL);
  const [verifying, setVerifying] = useState(false);
  const [newAdminId, setNewAdminId] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sendChatId, setSendChatId] = useState("");
  const [sendText, setSendText] = useState("");

  const load = async () => {
    const [{ data: c }, { data: u }, { data: m }, { data: n }] = await Promise.all([
      supabase.from("telegram_config").select("*").eq("id", 1).single(),
      supabase.from("telegram_users").select("*").order("last_interaction_at", { ascending: false }).limit(50),
      supabase.from("telegram_messages").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("telegram_notifications").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    setCfg(c as any);
    if ((c as any)?.mini_app_url) setMiniAppInput((c as any).mini_app_url);
    setUsers(u || []);
    setMessages(m || []);
    setNotifications(n || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // realtime updates for incoming messages
  useEffect(() => {
    const ch = supabase
      .channel("telegram-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "telegram_messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "telegram_users" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const callBot = async (action: string, body: any = {}) => {
    const { data, error } = await supabase.functions.invoke("telegram-bot", { body: { action, ...body } });
    if (error) throw new Error(error.message);
    if (!data?.ok) throw new Error(data?.error || "Falha");
    return data;
  };

  const verifyToken = async () => {
    if (!tokenInput.trim()) { toast.error("Cole o token do BotFather"); return; }
    if (!miniAppInput.trim()) { toast.error("Informe a URL do site (Mini App)"); return; }
    setVerifying(true);
    try {
      const res = await callBot("verify", { token: tokenInput.trim(), mini_app_url: miniAppInput.trim() });
      toast.success(`Bot @${res.bot.username} conectado! Webhook ativo.`);
      setTokenInput("");
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setVerifying(false); }
  };

  const updateField = async (patch: Partial<Cfg>) => {
    const { error } = await supabase.from("telegram_config").update(patch).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    setCfg((p) => (p ? { ...p, ...patch } : p));
  };

  const saveSettings = async () => {
    if (!cfg) return;
    await updateField({
      welcome_message: cfg.welcome_message,
      vip_welcome_message: cfg.vip_welcome_message,
      vip_channel_id: cfg.vip_channel_id,
      vip_channel_invite_link: cfg.vip_channel_invite_link,
      mini_app_url: cfg.mini_app_url,
    });
    toast.success("Configurações salvas. Mande /start no bot pra ver os botões atualizados.");
  };

  const addAdmin = async () => {
    const id = Number(newAdminId.trim());
    if (!id) { toast.error("ID inválido"); return; }
    const list = Array.isArray(cfg?.admin_chat_ids) ? [...cfg!.admin_chat_ids] : [];
    if (list.includes(id)) { toast.error("Já adicionado"); return; }
    list.push(id);
    await updateField({ admin_chat_ids: list });
    setNewAdminId("");
    toast.success("Admin adicionado");
  };

  const removeAdmin = async (id: number) => {
    const list = (cfg?.admin_chat_ids as number[]).filter((x) => x !== id);
    await updateField({ admin_chat_ids: list });
  };

  const checkWebhook = async () => {
    try {
      const r = await callBot("webhook_info");
      const i = r.info;
      if (i.url) toast.success(`Webhook OK · pendentes: ${i.pending_update_count}`);
      else toast.error("Webhook não registrado");
    } catch (e: any) { toast.error(e.message); }
  };

  const disconnect = async () => {
    if (!confirm("Desconectar bot? O webhook será removido.")) return;
    try { await callBot("disconnect"); toast.success("Desconectado"); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const processNotifs = async () => {
    try { const r = await callBot("process_notifications"); toast.success(`${r.processed} enviadas`); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const sendMessage = async () => {
    if (!sendChatId || !sendText) { toast.error("Preencha chat e mensagem"); return; }
    try { await callBot("send", { chat_id: Number(sendChatId), text: sendText }); toast.success("Enviado"); setSendText(""); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const isConnected = cfg?.is_active && cfg?.bot_token;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Bot className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-extrabold md:text-2xl">Telegram Bot</h1>
        <span>
          {isConnected ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Conectado
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="mr-1 h-3 w-3" /> Desconectado
            </Badge>
          )}
        </span>
      </div>

      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conectar bot</CardTitle>
            <CardDescription>
              1. Abra o <a className="underline" href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather</a> e envie <code>/newbot</code>.<br/>
              2. Cole o token e a URL do seu site abaixo. Conexão é automática (via webhook).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Token do bot</Label>
              <Input
                placeholder="123456789:ABCdefGHI..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                type="password"
              />
            </div>
            <div>
              <Label>URL do site (Mini App)</Label>
              <Input
                placeholder="https://seusite.com"
                value={miniAppInput}
                onChange={(e) => setMiniAppInput(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Esta URL abre dentro do Telegram quando o usuário clica nos botões. Use uma URL pública (https) — o domínio do preview funciona pra teste.
              </p>
            </div>
            <Button onClick={verifyToken} disabled={verifying} className="w-full sm:w-auto">
              {verifying ? "Conectando…" : "Conectar bot"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isConnected && cfg && (
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="settings">Config</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bot ativo</CardTitle>
                <CardDescription>
                  <a href={`https://t.me/${cfg.bot_username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    @{cfg.bot_username} <ExternalLink className="h-3 w-3" />
                  </a> · {cfg.bot_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Switch checked={cfg.is_active} onCheckedChange={(v) => updateField({ is_active: v })} />
                  <span className="text-sm">Bot ativo</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={checkWebhook}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Status webhook
                  </Button>
                  <Button size="sm" variant="default" onClick={async () => {
                    try { await callBot("refresh_webhook"); toast.success("Webhook reativado! Mande /start no bot."); }
                    catch (e: any) { toast.error(e.message); }
                  }}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Reativar webhook
                  </Button>
                  <Button size="sm" variant="outline" onClick={disconnect}>Desconectar</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Mini App (site dentro do bot)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>URL do seu site</Label>
                  <Input
                    placeholder="https://seusite.com"
                    value={cfg.mini_app_url || ""}
                    onChange={(e) => setCfg({ ...cfg, mini_app_url: e.target.value })}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Use HTTPS. O Telegram só abre Mini Apps em domínios seguros.
                  </p>
                </div>
                <Button onClick={saveSettings} className="w-full sm:w-auto">Salvar</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Mensagens automáticas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Mensagem de boas-vindas (/start)</Label>
                  <Textarea
                    rows={3}
                    value={cfg.welcome_message || ""}
                    onChange={(e) => setCfg({ ...cfg, welcome_message: e.target.value })}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Os botões aparecem automaticamente abaixo da mensagem.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>ID do canal VIP</Label>
                    <Input
                      placeholder="-100123456789"
                      value={cfg.vip_channel_id || ""}
                      onChange={(e) => setCfg({ ...cfg, vip_channel_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Link do canal VIP</Label>
                    <Input
                      placeholder="https://t.me/+abc..."
                      value={cfg.vip_channel_invite_link || ""}
                      onChange={(e) => setCfg({ ...cfg, vip_channel_invite_link: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={saveSettings} className="w-full sm:w-auto">Salvar</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Notificações automáticas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { k: "notify_on_new_sale", label: "Nova venda" },
                  { k: "notify_on_new_vip", label: "Novo VIP" },
                  { k: "notify_on_new_user", label: "Novo cadastro" },
                ].map((it) => (
                  <div key={it.k} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm">{it.label}</span>
                    <Switch
                      checked={(cfg as any)[it.k]}
                      onCheckedChange={(v) => updateField({ [it.k]: v } as any)}
                    />
                  </div>
                ))}
                <Button onClick={processNotifs} variant="outline" size="sm" className="w-full sm:w-auto">
                  <Bell className="mr-2 h-4 w-4" /> Enviar pendentes agora
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Admins do bot</CardTitle>
                <CardDescription>
                  Chat IDs que recebem notificações. Mande <code>/start</code> ao seu bot e veja seu ID na aba "Usuários".
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Chat ID numérico" value={newAdminId} onChange={(e) => setNewAdminId(e.target.value)} inputMode="numeric" />
                  <Button onClick={addAdmin}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2">
                  {(cfg.admin_chat_ids as number[] || []).map((id) => (
                    <div key={id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                      <code className="text-xs">{id}</code>
                      <Button size="icon" variant="ghost" onClick={() => removeAdmin(id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {!(cfg.admin_chat_ids as any[])?.length && (
                    <p className="text-xs text-muted-foreground">Nenhum admin cadastrado.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-3">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Mensagens recentes (atualiza em tempo real)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {messages.length === 0 && <p className="text-xs text-muted-foreground">Sem mensagens ainda. Mande /start ao bot.</p>}
                {messages.map((m) => (
                  <div key={m.id} className={`rounded-lg border p-2.5 text-sm ${m.direction === "incoming" ? "border-border bg-muted/30" : "border-primary/30 bg-primary/5"}`}>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{m.direction === "incoming" ? "↓ recebida" : "↑ enviada"} · chat {m.chat_id}</span>
                      <span>{new Date(m.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="mt-1 break-words">{m.text || <em className="text-muted-foreground">[sem texto]</em>}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Enviar mensagem</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Input placeholder="Chat ID" value={sendChatId} onChange={(e) => setSendChatId(e.target.value)} />
                <Textarea placeholder="Mensagem (HTML permitido)" rows={3} value={sendText} onChange={(e) => setSendText(e.target.value)} />
                <Button onClick={sendMessage} className="w-full sm:w-auto"><Send className="mr-2 h-4 w-4" /> Enviar</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-3">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Fila de notificações</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {notifications.length === 0 && <p className="text-xs text-muted-foreground">Vazio.</p>}
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold">{n.event_type}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                    <span>
                      <Badge variant={n.status === "sent" ? "default" : n.status === "failed" ? "destructive" : "secondary"}>
                        {n.status}
                      </Badge>
                    </span>
                  </div>
                ))}
                <Button onClick={processNotifs} size="sm" variant="outline" className="w-full sm:w-auto">
                  <Bell className="mr-2 h-4 w-4" /> Processar pendentes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-3">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Quem conversou com o bot</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {users.length === 0 && <p className="text-xs text-muted-foreground">Ninguém ainda. Mande /start ao seu bot.</p>}
                {users.map((u) => (
                  <div key={u.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {u.first_name} {u.last_name || ""} {u.username && <span className="text-muted-foreground">@{u.username}</span>}
                        </div>
                        <code className="text-[10px] text-muted-foreground">chat {u.chat_id}</code>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setSendChatId(String(u.chat_id)); toast.info("Chat selecionado, vá na aba Mensagens"); }}>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminTelegram;
