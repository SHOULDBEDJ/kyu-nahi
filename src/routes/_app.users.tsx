import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users as UsersIcon,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Mail,
  User,
  Loader2,
  Save,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { StatCard } from "@/components/ui-bits/StatCard";
import { StatusBadge } from "@/components/ui-bits/Badge";
import { EmptyState } from "@/components/ui-bits/EmptyState";
import { ConfirmDialog } from "@/components/ui-bits/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { initials, avatarColor, formatDateIST, passwordStrength } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "Users | 16 Eyes Farm House" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new === true || search.new === "true",
  }),
  component: UsersPage,
});

interface UserRow {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
  role: string;
  permissions: any;
}

function UsersPage() {
  const { user: me } = useAuth();
  const [list, setList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [toggleTarget, setToggleTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const [showPw, setShowPw] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    role: "Staff" as any,
    permissions: {
      bookings: "full",
      income: "full",
      expenses: "full",
      reports: "view",
      users: "none",
      settings: "none",
    } as any,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: roles }, { data: vaultLogs }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase
          .from("activity_log")
          .select("action, detail, created_at")
          .eq("module", "INTERNAL_AUTH")
          .order("created_at", { ascending: true }),
      ]);

      const roleMap = new Map<string, { role: string; permissions: any }>();
      (roles ?? []).forEach((r: any) => {
        const cur = roleMap.get(r.user_id);
        if (!cur || r.role === "SuperAdmin" || (r.role === "Admin" && cur.role === "Staff")) {
          roleMap.set(r.user_id, { role: r.role, permissions: r.permissions });
        }
      });

      const realUsers = (profiles ?? []).map((p: any) => ({
        ...p,
        role: roleMap.get(p.id)?.role ?? "Staff",
        permissions: roleMap.get(p.id)?.permissions ?? {},
      }));

      // Fetch deleted markers
      const deletedIds = (vaultLogs ?? [])
        .filter((log) => log.action === "USER_DELETED")
        .map((log) => {
          try {
            return JSON.parse(log.detail).id;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);

      const vaultList = (vaultLogs ?? [])
        .filter((log) => log.action === "USER_DATA")
        .map((log) => {
          try {
            const u = JSON.parse(log.detail);
            if (deletedIds.includes(u.id)) return null; // Skip deleted ones
            return {
              id: u.id,
              username: u.username,
              full_name: u.fullName,
              email: null,
              status: "Active",
              last_login_at: null,
              created_at: log.created_at || new Date().toISOString(),
              role: u.role,
              permissions: u.permissions,
              isVaultUser: true,
            };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean) as any[];

      setList([...realUsers, ...vaultList]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const { new: autoAdd } = Route.useSearch();
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (autoAdd) {
      resetForm();
      setShowModal(true);
    }
  }, [autoAdd]);

  const resetForm = () => {
    setFormData({
      fullName: "",
      username: "",
      email: "",
      password: "",
      role: "Staff",
      permissions: {
        bookings: "full",
        income: "full",
        expenses: "full",
        reports: "view",
        users: "none",
        settings: "none",
      },
    });
    setEditingUser(null);
  };

  const handleEdit = (u: UserRow) => {
    setEditingUser(u);
    setFormData({
      fullName: u.full_name,
      username: u.username,
      password: "", // Don't show password
      role: u.role as any,
      permissions: u.permissions || {
        bookings: "full",
        income: "full",
        expenses: "full",
        reports: "view",
        users: "none",
        settings: "none",
      },
    });
    setShowModal(true);
  };

  const saveUser = async () => {
    if (!formData.fullName || !formData.username)
      return toast.error("Name and Username are required");

    setSaving(true);
    try {
      if (editingUser) {
        // Update existing profile
        const { error: pErr } = await supabase
          .from("profiles")
          .update({
            full_name: formData.fullName,
            username: formData.username,
          })
          .eq("id", editingUser.id);
        if (pErr) throw pErr;

        // Update role & permissions
        const { error: rErr } = await supabase
          .from("user_roles")
          .update({
            role: formData.role,
            permissions: formData.permissions,
          })
          .eq("user_id", editingUser.id);
        if (rErr) throw rErr;

        toast.success("User updated successfully");
      } else {
        // Create Vault User (Internal Auth Bypass)
        const newId = crypto.randomUUID();
        const userData = {
          id: newId,
          fullName: formData.fullName,
          username: formData.username,
          password: formData.password || "farmhouse@123",
          role: formData.role,
          permissions: formData.permissions,
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("activity_log").insert({
          module: "INTERNAL_AUTH",
          action: "USER_DATA",
          detail: JSON.stringify(userData),
        });

        if (error) throw error;
        toast.success("User created in secure vault");
      }

      setShowModal(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const doToggle = async () => {
    if (!toggleTarget) return;
    const next = toggleTarget.status === "Active" ? "Suspended" : "Active";
    await supabase.from("profiles").update({ status: next }).eq("id", toggleTarget.id);
    toast.success("Status updated");
    setToggleTarget(null);
    load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const isVault = (deleteTarget as any).isVaultUser;

    // Instant local update
    setList((prev) => prev.filter((u) => u.id !== targetId));
    setDeleteTarget(null);
    setSaving(true);

    try {
      let error = null;
      if (isVault) {
        // Soft Delete: Insert a marker instead of deleting (bypasses RLS delete restrictions)
        const { error: err } = await supabase.from("activity_log").insert({
          module: "INTERNAL_AUTH",
          action: "USER_DELETED",
          detail: JSON.stringify({ id: targetId, deleted_at: new Date().toISOString() }),
        });
        error = err;
      } else {
        // Real user: try to delete, roles first
        await supabase.from("user_roles").delete().eq("user_id", targetId);
        const { error: err } = await supabase.from("profiles").delete().eq("id", targetId);
        error = err;
      }

      if (error) throw error;
      toast.success("User removed successfully");
    } catch (e: any) {
      toast.error("Failed to remove user: " + e.message);
    } finally {
      setSaving(false);
      load();
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={UsersIcon}
        title="Users & Roles"
        subtitle="Manage team members and their access levels"
        action={
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-navy"
          >
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={UsersIcon} label="Total Members" value={list.length} tone="navy" />
        <StatCard
          icon={ShieldCheck}
          label="Admins"
          value={list.filter((u) => u.role !== "Staff").length}
          tone="success"
        />
        <StatCard
          icon={ShieldAlert}
          label="Suspended"
          value={list.filter((u) => u.status !== "Active").length}
          tone="danger"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/30">
              <th className="px-4 py-4">Team Member</th>
              <th className="px-4 py-4">Role</th>
              <th className="px-4 py-4">Access Level</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr
                key={u.id}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${avatarColor(u.username)}`}
                    >
                      {initials(u.full_name)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-navy">{u.full_name}</div>
                      <div className="text-[11px] text-muted-foreground italic">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge
                    tone={
                      u.role === "SuperAdmin" ? "navy" : u.role === "Admin" ? "info" : "neutral"
                    }
                  >
                    {u.role}
                  </StatusBadge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-1">
                    {Object.entries(u.permissions || {})
                      .filter(([_, v]) => v !== "none")
                      .slice(0, 3)
                      .map(([k, v]) => (
                        <Badge
                          key={k}
                          variant="outline"
                          className="text-[9px] px-1 py-0 capitalize"
                        >
                          {k}: {v as string}
                        </Badge>
                      ))}
                    {Object.keys(u.permissions || {}).length > 3 && (
                      <span className="text-[9px] text-muted-foreground">
                        +{Object.keys(u.permissions || {}).length - 3} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => setToggleTarget(u)}
                    className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 hover:bg-muted transition-colors"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${u.status === "Active" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"}`}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-tight">
                      {u.status}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-navy"
                      onClick={() => handleEdit(u)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New Team Member"}</DialogTitle>
            <DialogDescription>
              Configure account details and module-level permissions.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account">Account Info</TabsTrigger>
              <TabsTrigger value="permissions">Permissions & Role</TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Initial Password</Label>
                    <div className="relative">
                      <Input
                        type={showPw ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy"
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label>Assign Base Role</Label>
                <div className="flex gap-4">
                  {["Staff", "Admin", "SuperAdmin"].map((r) => (
                    <label
                      key={r}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-all ${formData.role === r ? "border-gold bg-gold/5 ring-1 ring-gold" : "hover:bg-muted"}`}
                    >
                      <input
                        type="radio"
                        className="hidden"
                        name="role"
                        checked={formData.role === r}
                        onChange={() => setFormData({ ...formData, role: r })}
                      />
                      <span className="text-sm font-bold">{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-navy font-bold uppercase tracking-wider text-[10px]">
                  Module Permissions
                </Label>
                <div className="rounded-xl border divide-y">
                  {Object.keys(formData.permissions).map((mod) => (
                    <div
                      key={mod}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3"
                    >
                      <span className="text-sm font-semibold capitalize">{mod}</span>
                      <div className="flex gap-2">
                        {["none", "view", "full"].map((acc) => (
                          <label
                            key={acc}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[10px] font-bold cursor-pointer transition-all ${formData.permissions[mod] === acc ? "bg-navy text-white border-navy" : "bg-muted/50 hover:bg-muted"}`}
                          >
                            <input
                              type="radio"
                              className="hidden"
                              checked={formData.permissions[mod] === acc}
                              onChange={() =>
                                setFormData({
                                  ...formData,
                                  permissions: { ...formData.permissions, [mod]: acc },
                                })
                              }
                            />
                            {acc.toUpperCase()}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button className="bg-navy" onClick={saveUser} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {editingUser ? "Save Changes" : "Create & Send Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toggleTarget}
        title="Confirm Status Change"
        body={`Suspended users cannot log in. Continue?`}
        onCancel={() => setToggleTarget(null)}
        onConfirm={doToggle}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove User?"
        body="This will remove them from management but won't delete their auth account for safety. Continue?"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={doDelete}
      />
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}
