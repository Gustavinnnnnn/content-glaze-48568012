import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Placement = "home" | "explore" | "shorts";

export interface VideoRow {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  placement: Placement;
  is_vip: boolean;
  is_featured: boolean;
  is_active: boolean;
  preview_seconds: number;
  view_count: number;
  display_order: number;
  category_id: string | null;
  model_id: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  categories?: { name: string; slug: string } | null;
  models?: { id: string; name: string; handle: string; avatar_url: string | null } | null;
}

export interface ModelRow {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  monthly_price: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  site_tagline: string | null;
  logo_url: string | null;
  primary_color: string | null;
  vip_monthly_price: number;
  vip_duration_days: number;
  payment_gateway: string | null;
  payment_gateway_config: Record<string, unknown>;
  support_email: string | null;
}

// ---------- VIDEOS ----------
export const useVideos = (placement?: Placement) =>
  useQuery({
    queryKey: ["videos", placement ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("videos")
        .select("*, categories(name, slug), models(id, name, handle, avatar_url)")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (placement) q = q.eq("placement", placement);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VideoRow[];
    },
  });

export const useAllVideos = () =>
  useQuery({
    queryKey: ["videos", "admin-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*, categories(name, slug), models(id, name, handle, avatar_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VideoRow[];
    },
  });

export const useVideo = (id: string | null) =>
  useQuery({
    queryKey: ["video", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("videos")
        .select("*, categories(name, slug), models(id, name, handle, avatar_url)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as VideoRow | null;
    },
    enabled: !!id,
  });

// ---------- MODELS ----------
export const useModels = () =>
  useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("models")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ModelRow[];
    },
  });

export const useAllModels = () =>
  useQuery({
    queryKey: ["models", "admin-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("models").select("*").order("display_order");
      if (error) throw error;
      return (data ?? []) as ModelRow[];
    },
  });

export const useModel = (id: string | null) =>
  useQuery({
    queryKey: ["model", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("models").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as ModelRow | null;
    },
    enabled: !!id,
  });

export const useModelVideos = (modelId: string | null) =>
  useQuery({
    queryKey: ["model-videos", modelId],
    queryFn: async () => {
      if (!modelId) return [];
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("model_id", modelId)
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as VideoRow[];
    },
    enabled: !!modelId,
  });

// ---------- CATEGORIES ----------
export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

// ---------- SITE SETTINGS ----------
export const useSiteSettings = () =>
  useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as SiteSettings | null;
    },
  });

// ---------- SUBSCRIBE TO MODEL ----------
export const useSubscribeToModel = () => {
  const qc = useQueryClient();
  const { user, refresh } = useAuth();
  return useMutation({
    mutationFn: async ({ modelId, monthlyPrice }: { modelId: string; monthlyPrice: number }) => {
      if (!user) throw new Error("Você precisa entrar primeiro");
      // Create order (pending) — payment will mark it paid + create the subscription via webhook later.
      // For now, simulate payment success: insert order paid + subscription.
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);

      const { error: orderErr } = await supabase.from("orders").insert({
        user_id: user.id,
        purchase_type: "model_subscription",
        model_id: modelId,
        amount: monthlyPrice,
        status: "pending",
        duration_days: 30,
      });
      if (orderErr) throw orderErr;

      const { error: subErr } = await supabase.from("model_subscriptions").insert({
        user_id: user.id,
        model_id: modelId,
        expires_at: expires.toISOString(),
      });
      if (subErr) throw subErr;
    },
    onSuccess: async () => {
      await refresh();
      qc.invalidateQueries({ queryKey: ["model-subscriptions"] });
      toast.success("Assinatura ativada!", { description: "Acesso liberado por 30 dias." });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ---------- ACTIVATE VIP (placeholder until gateway) ----------
export const useActivateVip = () => {
  const qc = useQueryClient();
  const { user, refresh } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Você precisa entrar primeiro");
      const settings = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      const days = settings.data?.vip_duration_days ?? 30;
      const price = settings.data?.vip_monthly_price ?? 49.9;
      const expires = new Date();
      expires.setDate(expires.getDate() + days);

      const { error: orderErr } = await supabase.from("orders").insert({
        user_id: user.id,
        purchase_type: "vip_global",
        amount: price,
        status: "pending",
        duration_days: days,
      });
      if (orderErr) throw orderErr;

      const { error: vipErr } = await supabase.from("vip_subscriptions").insert({
        user_id: user.id,
        expires_at: expires.toISOString(),
      });
      if (vipErr) throw vipErr;
    },
    onSuccess: async () => {
      await refresh();
      qc.invalidateQueries();
      toast.success("VIP ativado!", { description: "Aproveite o acesso completo." });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ---------- VIEW HISTORY ----------
export const useUserHistory = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("video_views")
        .select("*, videos(id, title, thumbnail_url, placement)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
};

export const recordView = async (videoId: string, watchedSeconds: number, userId?: string) => {
  await supabase.from("video_views").insert({
    video_id: videoId,
    user_id: userId ?? null,
    watched_seconds: Math.floor(watchedSeconds),
  });
  // increment counter (best-effort)
  await supabase.rpc("increment", { row_id: videoId } as never).catch(() => {});
};
