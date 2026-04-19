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
import { Bot, CheckCircle2, XCircle, RefreshCw, Send, Plus, Trash2, MessageSquare, Bell } from "lucide-react";

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
  last_polled_at: string | null;
};

const AdminTelegram = () => {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [polling, setPolling] = useState(false);
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
    setUsers(u || []);
    setMessages(m || []);
    setNotifications(n || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const callBot = async (action: string, body: any = {}) => {
    const { data, error } = await supabase.functions.invoke("telegram-bot", { body: { action, ...body } });
    if (error) throw new Error(error.message);
    if (!data?.ok) throw new Error(data?.error || "Falha");
    return data;
  };

  const verifyToken = async () => {
    if (!tokenInput.trim()) { toast.error("Cole o token do BotFather"); return; }
    setVerifying(true);
    try {
      const res = await callBot("verify", { token: tokenInput.trim() });
      toast.success(`Bot conectado: @${res.bot.username}`);
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
    });
    toast.success("Configurações salvas");
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

  const poll = async () => {
    setPolling(true);
    try {
      const r = await callBot("poll");
      toast.success(`${r.processed} mensagens processadas`);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setPolling(false); }
  };

  const processNotifs = async () => {
    try {
      const r = await callBot("process_notifications");
      toast.success(`${r.processed} notificações enviadas`);
      await load();
    } catch (e: any) { toast.error(e.message); }
  };

  const sendMessage = async () => {
    if (!sendChatId || !sendText) { toast.error("Preencha chat e mensagem"); return; }
    try {
      await callBot("send", { chat_id: Number(sendChatId), text: sendText });
      toast.success("Enviado");
      setSendText("");
      await load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const isConnected = cfg?.is_active && cfg?.bot_token;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-extrabold md:text-2xl">Telegram Bot</h1>
        {isConnected ? (
          <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Conectado
          </Badge>
        ) : (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" /> Desconectado
          </Badge>
        )}
      </div>

      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conectar bot</CardTitle>
            <CardDescription>
              1. Abra o <a className="underline" href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather</a> no Telegram.<br/>
              2. Envie <code>/newbot</code> e siga as instruções.<br/>
              3. Cole o token aqui:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="123456789:ABCdefGHI..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              type="password"
            />
            <Button onClick={verifyToken} disabled={verifying} className="w-full sm:w-auto">
              {verifying ? "Verificando…" : "Conectar bot"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isConnected && (
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="settings">Config</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </TabsList>

          {/* SETTINGS */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bot conectado</CardTitle>
                <CardDescription>
                  @{cfg.bot_username} • {cfg.bot_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Switch
                    checked={cfg.is_active}
                    onCheckedChange={(v) => updateField({ is_active: v })}
                  />
                  <span className="text-sm">Bot ativo</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setTokenInput(""); updateField({ is_active: false, bot_token: null }); }}>
                  Desconectar bot
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Mensagens automáticas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Boas-vindas (/start)</Label>
                  <Textarea
                    rows={3}
                    value={cfg.welcome_message || ""}
                    onChange={(e) => setCfg({ ...cfg, welcome_message: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Boas-vindas para novo VIP</Label>
                  <Textarea
                    rows={3}
                    value={cfg.vip_welcome_message || ""}
                    onChange={(e) => setCfg({ ...cfg, vip_welcome_message: e.target.value })}
                  />
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
                    <Label>Link de convite VIP</Label>
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

          {/* ADMINS */}
          <TabsContent value="admins" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Admins do bot</CardTitle>
                <CardDescription>
                  Chat IDs que recebem notificações. Para descobrir seu ID, mande <code>/start</code> ao seu bot e veja na aba "Usuários".
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Chat ID numérico"
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value)}
                    inputMode="numeric"
                  />
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

          {/* MESSAGES */}
          <TabsContent value="messages" className="space-y-3">
            <Card>
              <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Mensagens recentes</CardTitle>
                <Button onClick={poll} disabled={polling} size="sm" variant="outline">
                  <RefreshCw className={`mr-2 h-4 w-4 ${polling ? "animate-spin" : ""}`} /> Buscar
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {messages.length === 0 && <p className="text-xs text-muted-foreground">Sem mensagens ainda.</p>}
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

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications" className="space-y-3">
            <Card>
              <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Fila de notificações</CardTitle>
                <Button onClick={processNotifs} size="sm" variant="outline"><Bell className="mr-2 h-4 w-4" /> Processar</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.length === 0 && <p className="text-xs text-muted-foreground">Vazio.</p>}
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold">{n.event_type}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                    <Badge variant={n.status === "sent" ? "default" : n.status === "failed" ? "destructive" : "secondary"}>
                      {n.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users" className="space-y-3">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Quem conversou com o bot</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {users.length === 0 && <p className="text-xs text-muted-foreground">Ninguém ainda. Mande <code>/start</code> ao seu bot e clique em "Buscar" na aba Mensagens.</p>}
                {users.map((u) => (
                  <div key={u.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {u.first_name} {u.last_name || ""} {u.username && <span className="text-muted-foreground">@{u.username}</span>}
                        </div>
                        <code className="text-[10px] text-muted-foreground">chat {u.chat_id}</code>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSendChatId(String(u.chat_id)); toast.info("Chat selecionado, vá na aba Mensagens"); }}
                      >
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
