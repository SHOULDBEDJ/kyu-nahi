import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  Download,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Settings as SetIcon,
  BarChart2,
} from "lucide-react";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { EmptyState } from "@/components/ui-bits/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeIST, initials, avatarColor } from "@/lib/format";

export const Route = createFileRoute("/_app/activity")({
  head: () => ({ meta: [{ title: "Activity Log | 16 Eyes Farm House" }] }),
  component: ActivityPage,
});

interface LogRow {
  id: string;
  action: string;
  module: string;
  detail: string | null;
  username: string | null;
  ip_address: string | null;
  created_at: string;
}

const ICONS: Record<string, any> = {
  Login: LogIn,
  Logout: LogOut,
  Create: Plus,
  Edit: Pencil,
  Delete: Trash2,
  "Status Change": SetIcon,
  "Report Generated": BarChart2,
};

function ActivityPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [search, setSearch] = useState("");
  const [mod, setMod] = useState("all");

  const load = async () => {
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs((data ?? []) as any);
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const filtered = logs.filter((l) => {
    if (mod !== "all" && l.module !== mod) return false;
    const q = search.toLowerCase().trim();
    if (
      q &&
      !((l.detail ?? "").toLowerCase().includes(q) || (l.username ?? "").toLowerCase().includes(q))
    )
      return false;
    return true;
  });

  const exportCSV = () => {
    const rows = [["Time", "Action", "Module", "User", "Detail"]];
    filtered.forEach((l) =>
      rows.push([
        formatDateTimeIST(l.created_at),
        l.action,
        l.module,
        l.username ?? "",
        l.detail ?? "",
      ]),
    );
    const csv = rows
      .map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modules = Array.from(new Set(logs.map((l) => l.module)));

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Clock}
        title="Activity Log"
        subtitle="System-wide audit trail"
        action={
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm text-white"
          >
            <Download size={14} /> Export CSV
          </button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search detail or user…"
          className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm"
          style={{ fontSize: 16 }}
        />
        <select
          value={mod}
          onChange={(e) => setMod(e.target.value)}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm"
        >
          <option value="all">All Modules</option>
          {modules.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="text-xs text-muted-foreground">{filtered.length} logs found</div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No activity yet"
          subtitle="Actions will appear here as users interact with the system."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Detail</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const Icon = ICONS[l.action] ?? Clock;
                return (
                  <tr key={l.id} className="border-b border-[#f0f0f0]">
                    <td className="px-4 py-3 text-sm">
                      <div className="inline-flex items-center gap-2">
                        <Icon size={14} />
                        {l.action}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                        {l.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{l.detail}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${avatarColor(l.username ?? "?")}`}
                        >
                          {initials(l.username ?? "?")}
                        </div>
                        <span className="text-sm">{l.username ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTimeIST(l.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
