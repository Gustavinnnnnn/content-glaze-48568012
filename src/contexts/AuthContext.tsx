import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "user" | "admin" | "super_admin";

export interface AdminPermissions {
  can_manage_videos: boolean;
  can_manage_models: boolean;
  can_manage_users: boolean;
  can_manage_admins: boolean;
  can_view_dashboard: boolean;
  can_manage_settings: boolean;
  can_view_sales: boolean;
}

interface VipInfo {
  isVip: boolean;
  expiresAt: Date | null;
  daysLeft: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string;
  roles: AppRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: AdminPermissions | null;
  vip: VipInfo;
  subscribedModelIds: string[];
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMPTY_VIP: VipInfo = { isVip: false, expiresAt: null, daysLeft: 0 };

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("Visitante");
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [vip, setVip] = useState<VipInfo>(EMPTY_VIP);
  const [subscribedModelIds, setSubscribedModelIds] = useState<string[]>([]);

  const loadUserData = useCallback(async (uid: string) => {
    // Run in parallel — RLS scopes everything to the user
    const [profileRes, rolesRes, permsRes, vipRes, modelSubsRes] = await Promise.all([
      supabase.from("profiles").select("display_name, is_banned").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("admin_permissions").select("*").eq("user_id", uid).maybeSingle(),
      supabase
        .from("vip_subscriptions")
        .select("expires_at")
        .eq("user_id", uid)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("model_subscriptions")
        .select("model_id")
        .eq("user_id", uid)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString()),
    ]);

    // Force logout if banned
    if (profileRes.data?.is_banned) {
      await supabase.auth.signOut();
      return;
    }

    if (profileRes.data?.display_name) setDisplayName(profileRes.data.display_name);
    setRoles((rolesRes.data?.map((r) => r.role as AppRole)) ?? []);
    setPermissions(permsRes.data as AdminPermissions | null);

    if (vipRes.data?.expires_at) {
      const expires = new Date(vipRes.data.expires_at);
      const days = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000));
      setVip({ isVip: true, expiresAt: expires, daysLeft: days });
    } else {
      setVip(EMPTY_VIP);
    }

    setSubscribedModelIds(modelSubsRes.data?.map((s) => s.model_id) ?? []);
  }, []);

  const refresh = useCallback(async () => {
    if (user) await loadUserData(user.id);
  }, [user, loadUserData]);

  useEffect(() => {
    // 1. Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer Supabase calls to avoid deadlock
        setTimeout(() => loadUserData(newSession.user.id), 0);
      } else {
        setDisplayName("Visitante");
        setRoles([]);
        setPermissions(null);
        setVip(EMPTY_VIP);
        setSubscribedModelIds([]);
      }
    });

    // 2. Then fetch existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        loadUserData(existing.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: name ? { display_name: name } : undefined,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isSuperAdmin = roles.includes("super_admin");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        displayName,
        roles,
        isAdmin,
        isSuperAdmin,
        permissions,
        vip,
        subscribedModelIds,
        signIn,
        signUp,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const hasPermission = (
  perms: AdminPermissions | null,
  isSuper: boolean,
  key: keyof AdminPermissions
): boolean => {
  if (isSuper) return true;
  return !!perms?.[key];
};
