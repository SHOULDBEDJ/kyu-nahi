// Typed query helpers, activity logger
import { supabase } from "@/integrations/supabase/client";

export type Module =
  | "Auth"
  | "Bookings"
  | "Income"
  | "Expenses"
  | "Users"
  | "Settings"
  | "Reports"
  | "Profile";

export async function logActivity(action: string, module: Module, detail: string) {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id ?? null;
  let username: string | null = null;
  if (userId) {
    const { data: p } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();
    username = p?.username ?? null;
  }
  await supabase.from("activity_log").insert({ user_id: userId, username, action, module, detail });
}
