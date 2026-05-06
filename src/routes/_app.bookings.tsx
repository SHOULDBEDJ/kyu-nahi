import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Plus, Search, Eye, Pencil, Trash2, MessageCircle, CheckCircle2, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { StatCard } from "@/components/ui-bits/StatCard";
import { StatusBadge } from "@/components/ui-bits/Badge";
import { EmptyState } from "@/components/ui-bits/EmptyState";
import { ConfirmDialog } from "@/components/ui-bits/ConfirmDialog";
import { BookingFormModal, type BookingFormData } from "@/components/bookings/BookingFormModal";
import { BookingViewModal, type ViewBooking } from "@/components/bookings/BookingViewModal";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/db";
import { formatINR, formatDateIST } from "@/lib/format";

export const Route = createFileRoute("/_app/bookings")({
  head: () => ({ meta: [{ title: "Bookings | 16 Eyes Farm House" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new === true || search.new === "true",
  }),
  component: BookingsPage,
});

interface Row extends ViewBooking { advance_paid: number; }

function BookingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [view, setView] = useState<"table"|"cards">("table");
  const [activeSection, setActiveSection] = useState<"all"|"drafts">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<BookingFormData | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [deletingDraft, setDeletingDraft] = useState<any | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [farm, setFarm] = useState<{name:string;address?:string;phone?:string;notes?:string}>({ name: "16 Eyes Farm House" });

  const load = async () => {
    setLoading(true);
    const [{ data: bks }, { data: log }, { data: drfts }] = await Promise.all([
      supabase.from("bookings").select("*, slot_id, slot:time_slots(name, color, start_time, end_time)").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("activity_log")
          .select("detail")
          .eq("module", "SETTINGS_STORAGE")
          .eq("action", "WHATSAPP_TEMPLATES")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      supabase.from("activity_log")
          .select("*")
          .eq("module", "BOOKING_DRAFT")
          .order("created_at", { ascending: false })
    ]);
    
    setRows((bks ?? []) as any);
    setDrafts((drfts ?? []).map(d => ({ ...JSON.parse(d.detail), log_id: d.id, created_at: d.created_at })));
    
    if (log?.detail) {
      try {
        const parsed = JSON.parse(log.detail);
        if (Array.isArray(parsed)) setTemplates(parsed);
      } catch (e) { console.error("Template parse error", e); }
    }
    setLoading(false);
  };
  const { new: autoAdd } = Route.useSearch();
  useEffect(() => { load(); }, []);
  useEffect(() => { if (autoAdd) setShowAdd(true); }, [autoAdd]);

  const getWhatsAppLink = (mobile: string, content: string) => {
    return `https://wa.me/91${mobile}?text=${encodeURIComponent(content)}`;
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase().trim();
    if (q && !(r.customer_name.toLowerCase().includes(q) || r.mobile.includes(q) || r.order_id.toLowerCase().includes(q))) return false;
    if (status !== "all" && r.status !== status) return false;
    return true;
  });

  const totalAgreed = rows.reduce((s, r) => s + Number(r.agreed_total), 0);
  const advance = rows.reduce((s, r) => s + Number(r.advance_paid), 0);
  const balance = rows.reduce((s, r) => s + Math.max(0, Number(r.agreed_total) - Number(r.advance_paid) - Number(r.discount)), 0);
  const confirmed = rows.filter((r) => r.status === "Confirmed").length;

  const markPaid = async (r: Row) => {
    await supabase.from("bookings").update({ advance_paid: r.agreed_total, discount: 0 }).eq("id", r.id);
    await logActivity("Mark as Paid", "Bookings", `Booking ${r.order_id} marked paid`);
    toast.success("Marked as paid");
    load();
  };

  const doDelete = async () => {
    if (!deleting) return;
    await supabase.from("bookings").update({ deleted_at: new Date().toISOString() }).eq("id", deleting.id);
    await logActivity("Delete", "Bookings", `Deleted booking ${deleting.order_id}`);
    toast.success("Booking deleted");
    setDeleting(null); load();
  };

  const doDeleteDraft = async () => {
    if (!deletingDraft) return;
    await supabase.from("activity_log").delete().eq("id", deletingDraft.log_id);
    toast.success("Draft deleted");
    setDeletingDraft(null); load();
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={CalendarDays} title="Bookings" subtitle="Manage all farmhouse bookings"
        action={<button onClick={() => { setEditing(null); setShowAdd(true); }} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-hover"><Plus size={16}/> Add Booking</button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Total" value={rows.length} tone="navy" />
        <StatCard icon={CheckCircle2} label="Confirmed" value={confirmed} tone="success" />
        <StatCard icon={CalendarDays} label="Advance" value={formatINR(advance)} tone="info" />
        <StatCard icon={CalendarDays} label="Balance Due" value={formatINR(balance)} tone="danger" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex rounded-md border border-input bg-card p-1">
          <button onClick={() => setActiveSection("all")} className={`rounded px-3 py-1.5 text-xs font-medium transition ${activeSection==="all"?"bg-navy text-white":"hover:bg-muted"}`}>All Bookings</button>
          <button onClick={() => setActiveSection("drafts")} className={`relative rounded px-3 py-1.5 text-xs font-medium transition ${activeSection==="drafts"?"bg-navy text-white":"hover:bg-muted"}`}>
            Drafts
            {drafts.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white">{drafts.length}</span>}
          </button>
        </div>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, ID…" className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm" style={{ fontSize: 16 }} />
        </div>
        {activeSection === "all" && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-input bg-card px-3 py-2 text-sm">
            <option value="all">All Status</option><option>Confirmed</option><option>Pending</option><option>Cancelled</option>
          </select>
        )}
        <div className="flex rounded-md border border-input bg-card">
          <button onClick={() => setView("table")} className={`px-3 py-2 ${view==="table"?"bg-gold text-white":""}`}><List size={14}/></button>
          <button onClick={() => setView("cards")} className={`px-3 py-2 ${view==="cards"?"bg-gold text-white":""}`}><LayoutGrid size={14}/></button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} results found</div>      {activeSection === "drafts" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {drafts.length === 0 ? (
            <div className="col-span-full py-10 text-center text-muted-foreground">No drafts saved.</div>
          ) : drafts.map((d, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saved {formatDateIST(d.created_at)}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium">DRAFT</span>
              </div>
              <div className="mt-1 font-semibold">{d.customer_name || "Untitled Draft"}</div>
              <div className="text-xs text-muted-foreground">{d.mobile ? `+91 ${d.mobile}` : "No mobile"}</div>
              <div className="mt-2 text-xs">Date: <b>{d.booking_date ? formatDateIST(d.booking_date) : "Not set"}</b></div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { setEditing(d); setShowAdd(true); }} className="flex-1 rounded-md bg-navy px-3 py-1.5 text-xs text-white">Resume</button>
                <button onClick={() => setDeletingDraft(d)} className="rounded-md border border-danger px-3 py-1.5 text-xs text-danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No bookings found" subtitle="Add your first booking to get started." action={<button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white"><Plus size={14}/> Add Booking</button>} />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[900px]">
            <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Order ID</th><th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date & Slot</th><th className="px-4 py-3">Guests</th>
              <th className="px-4 py-3 text-right">Agreed</th><th className="px-4 py-3 text-right">Advance</th>
              <th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((b) => {
                const bal = Number(b.agreed_total) - Number(b.advance_paid) - Number(b.discount);
                return (
                  <tr key={b.id} className="border-b border-[#f0f0f0] hover:bg-[#f9f8f4]">
                    <td className="px-4 py-3 text-sm font-medium text-gold">{b.order_id}</td>
                    <td className="px-4 py-3 text-sm"><div>{b.customer_name}</div><div className="text-[11px] text-muted-foreground">+91 {b.mobile}</div></td>
                    <td className="px-4 py-3 text-sm"><div>{formatDateIST(b.booking_date)}</div>{b.slot && <span className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] text-white" style={{backgroundColor: b.slot.color}}>{b.slot.name}</span>}</td>
                    <td className="px-4 py-3 text-sm">{b.guests}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatINR(b.agreed_total)}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatINR(b.advance_paid)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-medium ${bal>0?"text-danger":"text-success"}`}>{bal>0?formatINR(bal):"✓ Paid"}</td>
                    <td className="px-4 py-3"><StatusBadge tone={b.status==="Confirmed"?"success":b.status==="Pending"?"warning":"danger"}>{b.status}</StatusBadge></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1">
                      <button onClick={() => setViewing(b)} className="rounded p-1.5 hover:bg-muted" title="View"><Eye size={14}/></button>
                      <button onClick={() => { setEditing({ id: b.id, booking_date: b.booking_date, slot_id: (b as any).slot_id ?? "", customer_name: b.customer_name, mobile: b.mobile, id_proof_type: b.id_proof_type as any, id_proof_number: b.id_proof_number ?? "", guests: b.guests, agreed_total: b.agreed_total, advance_paid: b.advance_paid, discount: b.discount, status: b.status as any, notes: b.notes ?? "" }); setShowAdd(true); }} className="rounded p-1.5 hover:bg-muted" title="Edit"><Pencil size={14}/></button>
                      {bal > 0 && <button onClick={() => markPaid(b)} className="rounded p-1.5 text-success hover:bg-muted" title="Mark Paid"><CheckCircle2 size={14}/></button>}
                      
                      {/* WhatsApp Template Logic */}
                      {templates.map(t => (
                        <button 
                          key={t.id}
                          onClick={() => window.open(getWhatsAppLink(b.mobile, t.content), "_blank")}
                          className="rounded p-1.5 text-success hover:bg-muted flex items-center gap-1 group/wa"
                          title={`Send ${t.name}`}
                        >
                          <MessageCircle size={14} className="group-hover/wa:scale-110 transition-transform" />
                          <span className="hidden lg:inline text-[10px] font-bold">Send {t.name}</span>
                        </button>
                      ))}

                      {templates.length === 0 && (
                        <button onClick={() => window.open(`https://wa.me/91${b.mobile}?text=${encodeURIComponent(`Hello ${b.customer_name}, your booking on ${formatDateIST(b.booking_date)} is confirmed.`)}`,"_blank")} className="rounded p-1.5 text-success hover:bg-muted" title="Generic WhatsApp"><MessageCircle size={14}/></button>
                      )}
                      
                      <button onClick={() => setDeleting(b)} className="rounded p-1.5 text-danger hover:bg-muted" title="Delete"><Trash2 size={14}/></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((b) => {
            const bal = Number(b.agreed_total) - Number(b.advance_paid) - Number(b.discount);
            return (
              <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between"><span className="text-sm font-bold text-gold">{b.order_id}</span><StatusBadge tone={b.status==="Confirmed"?"success":b.status==="Pending"?"warning":"danger"}>{b.status}</StatusBadge></div>
                <div className="mt-1 font-semibold">{b.customer_name}</div>
                <div className="text-xs text-muted-foreground">+91 {b.mobile}</div>
                <div className="mt-2 flex items-center gap-2">{b.slot && <span className="rounded-full px-2 py-0.5 text-[10px] text-white" style={{backgroundColor: b.slot.color}}>{b.slot.name}</span>}<span className="text-xs">{formatDateIST(b.booking_date)}</span></div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs"><div>Agreed<br/><b>{formatINR(b.agreed_total)}</b></div><div>Advance<br/><b>{formatINR(b.advance_paid)}</b></div><div className={bal>0?"text-danger":"text-success"}>Balance<br/><b>{formatINR(bal)}</b></div></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setViewing(b)} className="flex-1 min-w-[60px] rounded-md border border-border px-2 py-1.5 text-xs">View</button>
                  <button onClick={() => { setEditing({ ...b, id: b.id } as any); setShowAdd(true); }} className="flex-1 min-w-[60px] rounded-md border border-border px-2 py-1.5 text-xs">Edit</button>
                  
                  {/* WhatsApp Template Logic (Cards) */}
                  {templates.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => window.open(getWhatsAppLink(b.mobile, t.content), "_blank")}
                      className="flex-1 min-w-[120px] rounded-md bg-green-500 text-white px-2 py-1.5 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <MessageCircle size={12} /> Send {t.name}
                    </button>
                  ))}
                  
                  <button onClick={() => setDeleting(b)} className="rounded-md border border-danger px-2 py-1.5 text-xs text-danger">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BookingFormModal open={showAdd} onClose={() => { setShowAdd(false); setEditing(null); }} onSaved={load} initial={editing} />
      <BookingViewModal open={!!viewing} onClose={() => setViewing(null)} booking={viewing} farmhouse={farm} />
      <ConfirmDialog open={!!deleting} title={`Delete ${deleting?.order_id}?`} body="This action cannot be undone." confirmLabel="Delete" danger onCancel={() => setDeleting(null)} onConfirm={doDelete} />
      <ConfirmDialog open={!!deletingDraft} title={`Delete Draft?`} body="This action cannot be undone." confirmLabel="Delete" danger onCancel={() => setDeletingDraft(null)} onConfirm={doDeleteDraft} />
    </div>
  );
}
