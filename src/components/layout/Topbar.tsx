import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, LogOut, Menu, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ConfirmDialog } from "@/components/ui-bits/ConfirmDialog";
import { initials, avatarColor } from "@/lib/format";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/bookings": "Bookings",
  "/income": "Income",
  "/expenses": "Expenses",
  "/reports": "Reports",
  "/users": "Users",
  "/activity": "Activity Log",
  "/profile": "Profile",
  "/settings": "Settings",
};

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = titleMap[path] ?? "Dashboard";
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Update document title per route
  useEffect(() => {
    if (typeof document !== "undefined") document.title = `${current} | 16 Eyes Farm House`;
  }, [current]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header
      data-topbar
      className="flex h-14 items-center justify-between bg-navy px-4 text-white md:px-6"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="text-white/80 hover:text-white md:hidden"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="hidden items-center gap-2 text-[13px] sm:flex">
          <span className="text-white/65">THE 16 EYES Farm House</span>
          <span className="text-white/45">›</span>
          <span className="font-medium text-white">{current}</span>
        </div>
        <div className="sm:hidden flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold font-bold text-navy overflow-hidden">
            {user?.avatarUrl ? (
              <img
                key={user.avatarUrl}
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              "16"
            )}
          </div>
          <span className="text-sm font-bold">16 EYES</span>
        </div>
      </div>

      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((s) => !s)}
          className="flex items-center gap-2.5 rounded-md px-2 py-1 hover:bg-white/10"
        >
          <div
            className={`flex h-9 w-9 overflow-hidden items-center justify-center rounded-full text-sm font-semibold text-white ${user ? (user.avatarUrl ? "" : avatarColor(user.username)) : "bg-gold"}`}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : user ? (
              initials(user.fullName)
            ) : (
              "?"
            )}
          </div>
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-sm font-medium">{user?.fullName ?? "Guest"}</div>
            <div className="text-[11px] text-white/65">{user?.role ?? ""}</div>
          </div>
          <ChevronDown size={14} className="hidden text-white/70 sm:block" />
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-md border border-border bg-card text-foreground shadow-lg">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted"
            >
              <UserIcon size={16} /> Profile
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                setConfirm(true);
              }}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-danger hover:bg-muted"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        title="Logout?"
        body="Are you sure you want to logout?"
        confirmLabel="Logout"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          logout();
          navigate({ to: "/login", replace: true });
        }}
      />
    </header>
  );
}
