import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/db";
import { initials, avatarColor, passwordStrength, formatMonthYear } from "@/lib/format";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile | 16 Eyes Farm House" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, refresh, logout } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [memberSince, setMemberSince] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.fullName); setEmail(user.email ?? "");
      supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle()
        .then(({ data }) => data && setMemberSince(formatMonthYear(data.created_at)));
    }
  }, [user]);

  const saveAccount = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: fullName, email }).eq("id", user.id);
    if (error) return toast.error(error.message);
    await logActivity("Edit", "Profile", "Updated account details");
    await refresh(); toast.success("Profile updated");
  };

  const updatePassword = async () => {
    if (pw.length < 8) return toast.error("Password too short");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    await logActivity("Password Change", "Profile", "Password updated");
    toast.success("Password updated. Logging out…");
    setTimeout(async () => { await logout(); window.location.href = "/login"; }, 1500);
  };

  if (!user) return null;
  const strength = passwordStrength(pw);

  return (
    <div className="space-y-5">
      <PageHeader icon={UserIcon} title="Profile" subtitle="Manage your account" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-col items-center">
            <div className={`flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white ${avatarColor(user.username)}`}>{initials(user.fullName)}</div>
            <span className="mt-2 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">{user.role}</span>
            {memberSince && <p className="mt-1 text-xs text-muted-foreground">Member since {memberSince}</p>}
          </div>
          <div className="space-y-3">
            <Field label="Full Name"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inp}/></Field>
            <Field label="Username"><input value={user.username} disabled className={inp + " opacity-60"}/></Field>
            <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} className={inp}/></Field>
            <button onClick={saveAccount} className="w-full rounded-md bg-navy px-4 py-2.5 text-sm text-white hover:bg-navy-hover">Save Changes</button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Change Password</h3>
          <div className="space-y-3">
            <Field label="New Password"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={inp}/></Field>
            {pw && (<>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full ${strength.color}`} style={{ width: `${strength.pct}%` }}/></div>
              <div className="text-xs text-muted-foreground">Strength: {strength.label}</div>
            </>)}
            <button onClick={updatePassword} disabled={pw.length < 8} className="w-full rounded-md bg-navy px-4 py-2.5 text-sm text-white disabled:opacity-50">Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-md border border-input bg-muted px-3 py-2 text-base outline-none focus:border-navy";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium">{label}</span>{children}</label>;
}
