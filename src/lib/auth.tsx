// Real Supabase auth + "Hidden Vault" fallback for internal users
import { useEffect, useState, createContext, useContext, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

export type AppRole = "SuperAdmin" | "Admin" | "Staff";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: AppRole;
  avatarUrl: string | null;
  permissions?: any;
  isVaultUser?: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function loadProfile(userId: string): Promise<AuthUser | null> {
  // Check if it's a real Supabase user
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, full_name, email, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role, permissions").eq("user_id", userId),
  ]);

  if (profile) {
    const list = (roles ?? []).map((r) => r.role as AppRole);
    const role: AppRole = list.includes("SuperAdmin")
      ? "SuperAdmin"
      : list.includes("Admin")
        ? "Admin"
        : "Staff";
    const permissions = roles?.find((r) => r.role === role)?.permissions;
    return {
      id: profile.id,
      username: profile.username,
      fullName: profile.full_name,
      email: profile.email,
      avatarUrl: profile.avatar_url,
      role,
      permissions,
    };
  }

  // Check if it's a vault user (stored in activity_log)
  const { data: vaultLog } = await supabase
    .from("activity_log")
    .select("detail")
    .eq("module", "INTERNAL_AUTH")
    .eq("action", "USER_DATA")
    .like("detail", `%${userId}%`)
    .maybeSingle();

  if (vaultLog?.detail) {
    try {
      const u = JSON.parse(vaultLog.detail);
      if (u.id === userId) {
        return {
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          email: null,
          avatarUrl: u.avatarUrl || null,
          role: u.role as AppRole,
          permissions: u.permissions,
          isVaultUser: true,
        };
      }
    } catch (e) {
      // Ignore parsing errors for vault users
    }
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Check local storage for vault session first
    const vaultSid = localStorage.getItem("vault_session_id");
    if (vaultSid) {
      const u = await loadProfile(vaultSid);
      if (u) {
        setUser(u);
        setLoading(false);
        return;
      }
    }

    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session) setUser(await loadProfile(data.session.user.id));
    else setUser(null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        setTimeout(async () => setUser(await loadProfile(s.user.id)), 0);
      } else if (!localStorage.getItem("vault_session_id")) {
        setUser(null);
      }
    });

    // Auto-provision default admin if no internal users exist
    (async () => {
      const { data: existing } = await supabase
        .from("activity_log")
        .select("id")
        .eq("module", "INTERNAL_AUTH")
        .limit(1);

      if (!existing || existing.length === 0) {
        console.log("Provisioning default admin...");
        const defaultAdmin = {
          id: "admin-001",
          username: "farmhouse@123",
          password: "farmhouse@123",
          fullName: "Narayan Solanki",
          role: "SuperAdmin",
          avatarUrl: null,
          permissions: { all: true },
        };
        const { error } = await supabase.from("activity_log").insert({
          module: "INTERNAL_AUTH",
          action: "USER_DATA",
          detail: JSON.stringify(defaultAdmin),
          user_id: "00000000-0000-0000-0000-000000000000", // Use valid UUID format
        });

        if (error) {
          console.error(
            "Provisioning failed. This is usually due to RLS policies. Please run the SQL migration for activity_log policies.",
            error,
          );
        } else {
          console.log("Provisioning successful!");
        }
      }
    })();

    refresh().finally(() => setLoading(false));
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const login = async (username: string, password: string, _remember: boolean) => {
    // 1. Try Vault Login First (Internal Management Users)
    const { data: vaultUsers } = await supabase
      .from("activity_log")
      .select("detail")
      .eq("module", "INTERNAL_AUTH")
      .eq("action", "USER_DATA");

    if (vaultUsers) {
      for (const log of vaultUsers) {
        try {
          if (!log.detail) continue;
          const u = JSON.parse(log.detail);
          if (u.username === username && u.password === password) {
            if (u.id) localStorage.setItem("vault_session_id", u.id);
            setUser({
              id: u.id,
              username: u.username,
              fullName: u.fullName,
              email: null,
              avatarUrl: u.avatarUrl || null,
              role: u.role,
              permissions: u.permissions,
              isVaultUser: true,
            });
            toast.success("Welcome back, " + u.fullName);
            return;
          }
        } catch (e) {
          // Ignore parsing errors for individual logs
        }
      }
    }

    // 2. Fallback to Real Supabase Auth
    const email = (username.includes("@") ? username : `${username}@local`).toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Invalid username or password");
  };

  const logout = async () => {
    localStorage.removeItem("vault_session_id");
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <Ctx.Provider value={{ user, session, loading, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

export function canAccess(role: AppRole | undefined, route: string): boolean {
  if (!role) return false;
  if (route.startsWith("/settings")) return role === "SuperAdmin";
  if (route.startsWith("/users") || route.startsWith("/reports") || route.startsWith("/activity"))
    return role === "SuperAdmin" || role === "Admin";
  return true;
}
