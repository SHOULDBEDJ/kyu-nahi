import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { StatCard } from "@/components/ui-bits/StatCard";
import { StatusBadge } from "@/components/ui-bits/Badge";
import { EmptyState } from "@/components/ui-bits/EmptyState";
import { ConfirmDialog } from "@/components/ui-bits/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { initials, avatarColor, formatDateIST } from "@/lib/format";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "Users | 16 Eyes Farm House" }] }),
  component: UsersPage,
});

interface UserRow { id: string; username: string; full_name: string; email: string | null; status: string; last_login_at: string | null; created_at: string; role: string; }

function UsersPage() {
  const { user: me } = useAuth();
  const [list, setList] = useState<UserRow[]>([]);
  const [toggleTarget, setToggleTarget] = useState<UserRow | null>(null);

  const load = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r: any) => {
      const cur = roleMap.get(r.user_id);
      if (!cur || r.role === "SuperAdmin" || (r.role === "Admin" && cur === "Staff")) roleMap.set(r.user_id, r.role);
    });
    setList((profiles ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.id) ?? "Staff" })));
  };
  useEffect(() => { load(); }, []);

  const doToggle = async () => {
    if (!toggleTarget) return;
    if (toggleTarget.id === me?.id) { toast.error("Cannot suspend your own account"); setToggleTarget(null); return; }
    const next = toggleTarget.status === "Active" ? "Suspended" : "Active";
    await supabase.from("profiles").update({ status: next }).eq("id", toggleTarget.id);
    await logActivity("Status Change", "Users", `${toggleTarget.username} → ${next}`);
    toast.success("Status updated"); setToggleTarget(null); load();
  };

  const active = list.filter((u) => u.status === "Active").length;
  const inactive = list.length - active;

  return (
    <div className="space-y-5">
      <PageHeader icon={Users} title="Users" subtitle="Manage team members and roles"
        action={<button disabled className="inline-flex items-center gap-2 rounded-md bg-navy/50 px-4 py-2.5 text-sm font-medium text-white" title="Add via SuperAdmin only — coming soon"><Plus size={16}/> Add User</button>} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users} label="Total" value={list.length} tone="navy" />
        <StatCard icon={Users} label="Active" value={active} tone="success" />
        <StatCard icon={Users} label="Inactive" value={inactive} tone="danger" />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[700px]">
            <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">User</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Last Login</th><th className="px-4 py-3">Status</th>
            </tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(u.username)}`}>{initials(u.full_name)}</div>
                      <div><div className="text-sm font-medium">{u.full_name}</div><div className="text-[11px] text-muted-foreground">@{u.username}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{u.email ?? "-"}</td>
                  <td className="px-4 py-3.5"><StatusBadge tone={u.role === "SuperAdmin" ? "navy" : u.role === "Admin" ? "info" : "neutral"}>{u.role}</StatusBadge></td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{u.last_login_at ? formatDateIST(u.last_login_at) : "Never"}</td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => setToggleTarget(u)} className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 hover:bg-muted">
                      <span className={`h-2.5 w-2.5 rounded-full ${u.status === "Active" ? "bg-success" : "bg-danger"}`} />
                      <span className="text-xs font-medium">{u.status}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={!!toggleTarget} title={toggleTarget?.status === "Active" ? "Suspend user?" : "Activate user?"}
        body={`${toggleTarget?.status === "Active" ? "Suspend" : "Activate"} ${toggleTarget?.full_name}?`}
        confirmLabel={toggleTarget?.status === "Active" ? "Suspend" : "Activate"} danger={toggleTarget?.status === "Active"}
        onCancel={() => setToggleTarget(null)} onConfirm={doToggle} />
    </div>
  );
}
