import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutGrid, Calendar, IndianRupee, AlertCircle, Plus, ArrowRight, CalendarDays, Receipt, BarChart2, Users } from "lucide-react";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { StatCard } from "@/components/ui-bits/StatCard";
import { StatusBadge } from "@/components/ui-bits/Badge";
import { EmptyState } from "@/components/ui-bits/EmptyState";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, formatDateIST, todayIST, nowYearMonthIST, thisWeekRangeIST } from "@/lib/format";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | 16 Eyes Farm House" }] }),
  component: Dashboard,
});

interface BookingRow {
  id: string; order_id: string; customer_name: string; mobile: string; booking_date: string;
  agreed_total: number; advance_paid: number; discount: number; status: string; created_at: string;
  slot: { name: string; color: string; is_overnight: boolean; start_time: string; end_time: string } | null;
}

function Dashboard() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("id, order_id, customer_name, mobile, booking_date, agreed_total, advance_paid, discount, status, created_at, slot:time_slots(name, color, is_overnight, start_time, end_time)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setBookings((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const today = todayIST();
  const { y, m } = nowYearMonthIST();
  const [weekStart, weekEnd] = thisWeekRangeIST();

  const total = bookings.length;
  const todays = bookings.filter((b) => b.booking_date === today).length;
  const monthly = bookings.filter((b) => {
    const [by, bm] = b.booking_date.split("-").map(Number);
    return by === y && bm === m;
  }).length;
  const weekly = bookings.filter((b) => b.booking_date >= weekStart && b.booking_date <= weekEnd).length;
  const upcoming = bookings.filter((b) => b.status === "Confirmed" && b.booking_date > today).length;
  const recent = bookings.slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader icon={LayoutGrid} title="Dashboard" subtitle="Overview of your farmhouse operations" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard icon={Calendar} label="Total" value={total} tone="navy" />
        <StatCard icon={Calendar} label="Today" value={todays} tone="success" />
        <StatCard icon={Calendar} label="This Month" value={monthly} tone="info" />
        <StatCard icon={Calendar} label="This Week" value={weekly} tone="gold" />
        <StatCard icon={AlertCircle} label="Upcoming" value={upcoming} tone="info" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {[
          { to: "/bookings", label: "Add Booking", icon: Plus },
          { to: "/income",   label: "Add Income",  icon: IndianRupee },
          { to: "/expenses", label: "Add Expense", icon: Receipt },
          { to: "/users",    label: "Add User",    icon: Users },
          { to: "/reports",  label: "Report",      icon: BarChart2 },
        ].map((a) => (
          <Link key={a.label} to={a.to} search={{ new: true }} className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium hover:border-navy hover:text-navy">
            <a.icon size={16} /> {a.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-3"><MiniCalendar bookings={bookings} /></div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Recent Bookings</h2>
          <Link to="/bookings" className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline">
            View All <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-md bg-muted lk-pulse" />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Calendar} title="No bookings yet" subtitle="Create your first booking to see it here." action={<Link to="/bookings" className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white"><Plus size={14}/> Add Booking</Link>} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Order ID</th><th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date & Slot</th><th className="px-4 py-3 text-right">Agreed ₹</th>
                  <th className="px-4 py-3 text-right">Balance ₹</th><th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((b) => {
                  const balance = Number(b.agreed_total) - Number(b.advance_paid) - Number(b.discount);
                  return (
                    <tr key={b.id} className="border-b border-[#f0f0f0] hover:bg-[#f9f8f4]">
                      <td className="px-4 py-3 text-sm font-medium text-gold">{b.order_id}</td>
                      <td className="px-4 py-3 text-sm">{b.customer_name}</td>
                      <td className="px-4 py-3 text-sm">
                        <div>{formatDateIST(b.booking_date)}</div>
                        {b.slot && <span className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: b.slot.color }}>{b.slot.name}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">{formatINR(b.agreed_total)}</td>
                      <td className={`px-4 py-3 text-right text-sm font-medium ${balance > 0 ? "text-danger" : "text-success"}`}>
                        {balance > 0 ? formatINR(balance) : "✓ Paid"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={b.status === "Confirmed" ? "success" : b.status === "Pending" ? "warning" : "danger"}>{b.status}</StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
