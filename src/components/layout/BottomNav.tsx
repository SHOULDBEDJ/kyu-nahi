// Mobile bottom nav (< 640px)
import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, CalendarDays, Receipt, BarChart2, MoreHorizontal, DollarSign, Users, Clock, User, Settings, X } from "lucide-react";

const main = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings",  label: "Bookings",  icon: CalendarDays },
  { to: "/expenses",  label: "Expenses",  icon: Receipt },
  { to: "/reports",   label: "Reports",   icon: BarChart2 },
] as const;

const more = [
  { to: "/income",   label: "Income",       icon: DollarSign },
  { to: "/users",    label: "Users",        icon: Users },
  { to: "/activity", label: "Activity Log", icon: Clock },
  { to: "/profile",  label: "Profile",      icon: User },
  { to: "/settings", label: "Settings",     icon: Settings },
] as const;

export function BottomNav() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-[300] flex h-[60px] items-stretch border-t border-white/10 bg-navy text-white sm:hidden">
        {main.map(({ to, label, icon: Icon }) => {
          const active = path.startsWith(to);
          return (
            <Link key={to} to={to} className={`flex flex-1 flex-col items-center justify-center gap-0.5 ${active ? "text-gold" : "text-white/70"}`}>
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
        <button onClick={() => setOpen(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-white/70" aria-label="More">
          <MoreHorizontal size={20} />
          <span className="text-[10px]">More</span>
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[400] sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">More</h3>
              <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {more.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} onClick={() => setOpen(false)} className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 hover:bg-muted">
                  <Icon size={22} className="text-navy" />
                  <span className="text-[11px] font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
