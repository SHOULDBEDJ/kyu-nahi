import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarDays, DollarSign, Receipt, BarChart2, Users, Clock, User, Settings, LogOut,
} from "lucide-react";
import { useAuth, canAccess } from "@/lib/auth";
import { ConfirmDialog } from "@/components/ui-bits/ConfirmDialog";
import { initials, avatarColor } from "@/lib/format";
import { logActivity } from "@/lib/db";

const nav = [
  { to: "/dashboard",  label: "Dashboard",    icon: LayoutDashboard },
  { to: "/bookings",   label: "Bookings",     icon: CalendarDays },
  { to: "/income",     label: "Income",       icon: DollarSign },
  { to: "/expenses",   label: "Expenses",     icon: Receipt },
  { to: "/reports",    label: "Reports",      icon: BarChart2 },
  { to: "/users",      label: "Users",        icon: Users },
  { to: "/activity",   label: "Activity Log", icon: Clock },
  { to: "/profile",    label: "Profile",      icon: User },
  { to: "/settings",   label: "Settings",     icon: Settings },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <aside data-sidebar className="flex h-full w-60 flex-col bg-navy text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold font-bold text-navy overflow-hidden shadow-inner ring-2 ring-white/10">
          {user?.avatarUrl && !imgError ? (
            <img 
              key={user.avatarUrl}
              src={user.avatarUrl} 
              alt="" 
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            "16"
          )}
        </div>
        <div className="leading-tight">
          <div className="text-[11px] uppercase tracking-wider text-white/60">The</div>
          <div className="text-sm font-bold">16 EYES Farm House</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {nav.filter((i) => canAccess(user?.role, i.to)).map((item) => {
          const active = path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to} to={item.to} onClick={onNavigate}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-white text-navy font-medium shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        {user && (
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full overflow-hidden text-xs font-semibold text-white ${user.avatarUrl ? "" : avatarColor(user.username)}`}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : initials(user.fullName)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium">{user.fullName}</div>
              <div className="text-[11px] text-white/60">{user.role}</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setConfirm(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} strokeWidth={1.75} /> Logout
        </button>
      </div>

      <ConfirmDialog
        open={confirm} title="Logout?" body="Are you sure you want to logout?" confirmLabel="Logout" danger
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false);
          await logActivity("Logout", "Auth", `User ${user?.username} logged out`);
          await logout();
          navigate({ to: "/login", replace: true });
        }}
      />
    </aside>
  );
}
