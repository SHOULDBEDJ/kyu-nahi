// Real Supabase auth. Username is mapped to {username}.local internally.
import { useEffect, useState, createContext, useContext, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AppRole = "SuperAdmin" | "Admin" | "Staff";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: AppRole;
  avatarUrl: string | null;
}

const usernameToEmail = (u: string) => (u.includes("@") ? u : `${u}@local`).toLowerCase();
// Our seed account uses "farmhouse@123" as username -> "farmhouse@123.local" as email
const SEED_EMAIL_FOR = (u: string) => (u.toLowerCase() === "farmhouse@123" ? "farmhouse@123.local" : usernameToEmail(u));

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
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, username, full_name, email, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (!profile) return null;
  // Pick highest privilege role
  const list = (roles ?? []).map((r) => r.role as AppRole);
  const role: AppRole = list.includes("SuperAdmin") ? "SuperAdmin" : list.includes("Admin") ? "Admin" : "Staff";
  return {
    id: profile.id,
    username: profile.username,
    fullName: profile.full_name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session) setUser(await loadProfile(data.session.user.id));
    else setUser(null);
  }, []);

  useEffect(() => {
    // Set up listener BEFORE getSession (per Supabase guidance)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        // Defer DB call to avoid deadlock inside the listener
        setTimeout(async () => setUser(await loadProfile(s.user.id)), 0);
      } else {
        setUser(null);
      }
    });
    refresh().finally(() => setLoading(false));
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const login = async (username: string, password: string, _remember: boolean) => {
    const email = SEED_EMAIL_FOR(username);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Invalid username or password");
    // update last_login_at
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", u.user.id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return <Ctx.Provider value={{ user, session, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
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
