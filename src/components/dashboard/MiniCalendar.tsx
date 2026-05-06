import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatDateIST, formatINR } from "@/lib/format";

interface BookingRow {
  id: string; order_id: string; customer_name: string; booking_date: string;
  agreed_total: number; advance_paid: number; discount: number; status: string;
  slot: { name: string; color: string } | null;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function MiniCalendar({ bookings }: { bookings: BookingRow[] }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = new Date().toISOString().slice(0, 10);

  const byDate = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    bookings.forEach((b) => {
      const arr = map.get(b.booking_date) ?? [];
      arr.push(b);
      map.set(b.booking_date, arr);
    });
    return map;
  }, [bookings]);

  const cells: ({ day: number; iso: string } | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, iso });
  }

  const selected = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{MONTH_NAMES[month]} {year}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted" aria-label="Previous"><ChevronLeft size={16} /></button>
          <button onClick={() => setCursor(new Date())} className="rounded-md px-3 py-1.5 text-xs font-medium hover:bg-muted">Today</button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted" aria-label="Next"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const items = byDate.get(c.iso) ?? [];
          const isToday = c.iso === todayIso;
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(c.iso)}
              className={`flex aspect-square min-h-12 flex-col items-stretch rounded-md border p-1 text-left transition ${isToday ? "border-navy bg-navy/5" : "border-border hover:border-navy/40"}`}
            >
              <div className="text-[11px] font-semibold">{c.day}</div>
              <div className="mt-auto space-y-0.5">
                {items.length === 0 ? (
                  <div className="text-[9px] text-success">Available</div>
                ) : (
                  items.slice(0, 2).map((b) => (
                    <div key={b.id} className="hidden truncate rounded px-1 py-0.5 text-[9px] font-medium text-white sm:block" style={{ backgroundColor: b.slot?.color ?? "#888" }}>
                      {b.slot?.name ?? "Booked"}
                    </div>
                  ))
                )}
                {items.length > 0 && (
                  <div className="flex justify-center gap-0.5 sm:hidden">
                    {items.slice(0, 3).map((b) => (
                      <span key={b.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: b.slot?.color ?? "#888" }} />
                    ))}
                  </div>
                )}
                {items.length > 2 && <div className="hidden text-[9px] text-muted-foreground sm:block">+{items.length - 2}</div>}
              </div>
            </button>
          );
        })}
      </div>

      <Legend />

      {selectedDate && (
        <div className="fixed inset-0 z-[400] flex items-end justify-center sm:items-center" onClick={() => setSelectedDate(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full bg-card p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{formatDateIST(selectedDate)}</h3>
              <button onClick={() => setSelectedDate(null)} className="p-1.5 text-muted-foreground"><X size={18} /></button>
            </div>
            {selected.length === 0 ? (
              <p className="text-sm text-success">Available — no bookings.</p>
            ) : (
              <ul className="space-y-2">
                {selected.map((b) => {
                  const bal = Number(b.agreed_total) - Number(b.advance_paid) - Number(b.discount);
                  return (
                    <li key={b.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{b.customer_name}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] text-white" style={{ backgroundColor: b.slot?.color ?? "#888" }}>{b.slot?.name}</span>
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                        <span>Agreed {formatINR(b.agreed_total)}</span>
                        <span className={bal > 0 ? "text-danger" : "text-success"}>Bal {formatINR(bal)}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{b.order_id} · {b.status}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  const items = [
    { c: "#4caf50", l: "Morning" }, { c: "#ffc107", l: "Eve-to-Eve" }, { c: "#1a237e", l: "Photoshoot" },
    { c: "#87ceeb", l: "Eve" }, { c: "#ff7043", l: "Full Day" },
  ];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
      {items.map((i) => (
        <div key={i.l} className="flex items-center gap-1.5 text-[11px]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i.c }} /> {i.l}
        </div>
      ))}
      <div className="flex items-center gap-1.5 text-[11px]"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Available</div>
    </div>
  );
}
