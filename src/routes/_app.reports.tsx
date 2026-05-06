import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart2, Download, Printer, History, Loader2, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { StatCard } from "@/components/ui-bits/StatCard";
import { EmptyState } from "@/components/ui-bits/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, formatDateIST, formatDateTimeIST } from "@/lib/format";
import { logActivity } from "@/lib/db";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports | 16 Eyes Farm House" }] }),
  component: ReportsPage,
});

const TYPES = [
  { id: "booking", label: "Booking Report" },
  { id: "income", label: "Other Income Report" },
  { id: "expense", label: "Expense Report" },
  { id: "pl", label: "Profit & Loss" },
  { id: "revenue", label: "Revenue Summary" },
  { id: "combined", label: "Combined Financial" },
] as const;

function ReportsPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [farm, setFarm] = useState<{ name: string; address?: string; phone?: string }>({ name: "16 Eyes Farm House" });

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data: h } = await supabase.from("activity_log")
      .select("*")
      .eq("module", "REPORT_HISTORY")
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory((h ?? []).map(item => ({ ...JSON.parse(item.detail), id: item.id, created_at: item.created_at })));
    setLoadingHistory(false);
  };

  useEffect(() => {
    supabase.from("settings").select("farmhouse_name, address, phone").maybeSingle()
      .then(({ data }) => data && setFarm({ name: data.farmhouse_name, address: data.address ?? undefined, phone: data.phone ?? undefined }));
    loadHistory();
  }, []);

  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const generate = async (params?: { from: string; to: string; selected: string[] }) => {
    const f = params?.from ?? from;
    const t = params?.to ?? to;
    const s = params?.selected ?? selected;

    let bq = supabase.from("bookings").select("*, slot:time_slots(name)").is("deleted_at", null);
    let iq = supabase.from("incomes").select("*, type:income_types(name)").is("deleted_at", null);
    let eq = supabase.from("expenses").select("*, type:expense_types(name)").is("deleted_at", null);
    
    if (f) { bq = bq.gte("booking_date", f); iq = iq.gte("date", f); eq = eq.gte("date", f); }
    if (t) { bq = bq.lte("booking_date", t); iq = iq.lte("date", t); eq = eq.lte("date", t); }
    
    const [{ data: b }, { data: i }, { data: e }] = await Promise.all([bq, iq, eq]);
    setData({ bookings: b ?? [], incomes: i ?? [], expenses: e ?? [] });

    if (!params) {
      await supabase.from("activity_log").insert({
        module: "REPORT_HISTORY",
        action: "GENERATE",
        detail: JSON.stringify({ from: f, to: t, selected: s })
      });
      loadHistory();
    }
    
    await logActivity("Report Generated", "Reports", `Types: ${s.join(", ")}`);
  };

  const downloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    // Cover
    doc.setFillColor(245, 244, 239); doc.rect(0, 0, 210, 297, "F");
    doc.setTextColor(26, 35, 126); doc.setFontSize(28); doc.text(farm.name, 105, 60, { align: "center" });
    doc.setFontSize(12); doc.setTextColor(100); doc.text(farm.address ?? "", 105, 70, { align: "center" });
    doc.text(farm.phone ?? "", 105, 76, { align: "center" });
    doc.setFontSize(18); doc.setTextColor(26, 35, 126);
    doc.text(selected.map((s) => TYPES.find((t) => t.id === s)?.label).filter(Boolean).join(" + "), 105, 110, { align: "center", maxWidth: 180 });
    doc.setFontSize(11); doc.setTextColor(60);
    doc.text(`Period: ${from || "All"} to ${to || "Now"}`, 105, 130, { align: "center" });
    doc.text(`Generated: ${formatDateTimeIST(new Date())}`, 105, 138, { align: "center" });
    doc.text(`By: ${user?.fullName ?? "—"}`, 105, 146, { align: "center" });

    selected.forEach((sec) => {
      doc.addPage();
      const title = TYPES.find((t) => t.id === sec)?.label ?? sec;
      doc.setFontSize(16); doc.setTextColor(26, 35, 126); doc.text(title, 14, 18);
      if (sec === "booking") {
        autoTable(doc, { startY: 24, head: [["Order ID","Customer","Date","Slot","Guests","Agreed","Advance","Balance","Status"]],
          body: data.bookings.map((b: any) => [b.order_id, b.customer_name, formatDateIST(b.booking_date), b.slot?.name ?? "-", b.guests, formatINR(b.agreed_total), formatINR(b.advance_paid), formatINR(b.agreed_total - b.advance_paid - b.discount), b.status]),
          headStyles: { fillColor: [26, 35, 126], textColor: 255 }, alternateRowStyles: { fillColor: [245, 244, 239] }, styles: { fontSize: 8 }});
      } else if (sec === "income") {
        autoTable(doc, { startY: 24, head: [["Date","Type","Amount","Payment","Reference","Description"]],
          body: data.incomes.map((i: any) => [formatDateIST(i.date), i.type?.name ?? "-", formatINR(i.amount), i.payment_mode, i.reference ?? "", i.description ?? ""]),
          headStyles: { fillColor: [26, 35, 126], textColor: 255 }, alternateRowStyles: { fillColor: [245, 244, 239] }, styles: { fontSize: 9 }});
      } else if (sec === "expense") {
        autoTable(doc, { startY: 24, head: [["Date","Type","Amount","Payment","Vendor","Description"]],
          body: data.expenses.map((e: any) => [formatDateIST(e.date), e.type?.name ?? "-", formatINR(e.amount), e.payment_mode, e.vendor ?? "", e.description ?? ""]),
          headStyles: { fillColor: [26, 35, 126], textColor: 255 }, alternateRowStyles: { fillColor: [245, 244, 239] }, styles: { fontSize: 9 }});
      } else if (sec === "pl") {
        const bookIncome = data.bookings.reduce((s: number, b: any) => s + Number(b.advance_paid), 0);
        const otherIn = data.incomes.reduce((s: number, i: any) => s + Number(i.amount), 0);
        const exp = data.expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
        const net = bookIncome + otherIn - exp;
        autoTable(doc, { startY: 24, head: [["Item", "Amount"]], body: [
          ["Booking Income", formatINR(bookIncome)], ["Other Income", formatINR(otherIn)],
          ["Total Income", formatINR(bookIncome + otherIn)], ["Total Expenses", formatINR(exp)],
          [{ content: "Net P&L", styles: { fontStyle: "bold" } }, { content: formatINR(net), styles: { fontStyle: "bold", textColor: net >= 0 ? [39, 174, 96] : [231, 76, 60] }}],
        ], headStyles: { fillColor: [26, 35, 126], textColor: 255 }});
      }
    });
    doc.save(`16efh-report-${Date.now()}.pdf`);
  };

  const loadFromHistory = async (h: any, action: "view" | "print" | "download") => {
    setFrom(h.from); setTo(h.to); setSelected(h.selected);
    await generate({ from: h.from, to: h.to, selected: h.selected });
    if (action === "print") setTimeout(() => window.print(), 500);
    if (action === "download") setTimeout(() => downloadPDF(), 500);
  };

  const deleteHistory = async (id: string) => {
    await supabase.from("activity_log").delete().eq("id", id);
    loadHistory();
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={BarChart2} title="Reports" subtitle="Generate financial reports"
        action={<div className="flex gap-2">
          <button onClick={() => window.print()} disabled={!data} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm disabled:opacity-50"><Printer size={14}/> Print</button>
          <button onClick={downloadPDF} disabled={!data || selected.length===0} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm text-white disabled:opacity-50"><Download size={14}/> PDF</button>
        </div>} />

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Report Types</h3>
          <div className="flex gap-2 text-xs">
            <button onClick={() => setSelected(TYPES.map((t) => t.id))} className="rounded px-2 py-1 hover:bg-muted">Select All</button>
            <button onClick={() => setSelected([])} className="rounded px-2 py-1 hover:bg-muted">Clear All</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TYPES.map((t) => {
            const on = selected.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggle(t.id)} className={`rounded-md border px-3 py-3 text-left text-sm transition ${on ? "border-gold bg-gold/10 font-medium" : "border-border hover:border-navy/30"}`}>
                {on && "✓ "}{t.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="block text-xs"><span className="mb-1 block font-medium">From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inp}/></label>
          <label className="block text-xs"><span className="mb-1 block font-medium">To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inp}/></label>
          <div className="flex items-end gap-2">
            <button onClick={generate} disabled={selected.length===0} className="flex-1 rounded-md bg-navy px-4 py-2 text-sm text-white disabled:opacity-50">Generate</button>
            <button onClick={() => { setSelected([]); setFrom(""); setTo(""); setData(null); }} className="rounded-md border border-danger px-3 py-2 text-sm text-danger">Reset</button>
          </div>
        </div>
      </div>

      {!data && <EmptyState icon={BarChart2} title="No report generated" subtitle="Select report types and click Generate." />}

      {data && selected.includes("pl") && (() => {
        const bookIncome = data.bookings.reduce((s: number, b: any) => s + Number(b.advance_paid), 0);
        const otherIn = data.incomes.reduce((s: number, i: any) => s + Number(i.amount), 0);
        const exp = data.expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
        const net = bookIncome + otherIn - exp;
        return (
          <section className="space-y-3">
            <h2 className="text-base font-semibold">Profit & Loss</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard icon={BarChart2} label="Total Income" value={formatINR(bookIncome + otherIn)} tone="success" />
              <StatCard icon={BarChart2} label="Total Expenses" value={formatINR(exp)} tone="danger" />
              <StatCard icon={BarChart2} label="Net P&L" value={formatINR(net)} tone={net >= 0 ? "success" : "danger"} />
            </div>
          </section>
        );
      })()}

      {data && selected.includes("booking") && (
        <Section title="Booking Report" empty={data.bookings.length === 0}>
          <table className="w-full min-w-[800px]"><thead><tr className="border-b text-left text-[11px] uppercase text-muted-foreground"><th className="px-3 py-2">Order ID</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">Agreed</th><th className="px-3 py-2 text-right">Balance</th><th className="px-3 py-2">Status</th></tr></thead><tbody>
            {data.bookings.map((b: any) => <tr key={b.id} className="border-b"><td className="px-3 py-2 text-xs text-gold">{b.order_id}</td><td className="px-3 py-2 text-xs">{b.customer_name}</td><td className="px-3 py-2 text-xs">{formatDateIST(b.booking_date)}</td><td className="px-3 py-2 text-right text-xs">{formatINR(b.agreed_total)}</td><td className="px-3 py-2 text-right text-xs">{formatINR(b.agreed_total - b.advance_paid - b.discount)}</td><td className="px-3 py-2 text-xs">{b.status}</td></tr>)}
          </tbody></table>
        </Section>
      )}
      {data && selected.includes("income") && (
        <Section title="Other Income Report" empty={data.incomes.length === 0}>
          <table className="w-full"><thead><tr className="border-b text-left text-[11px] uppercase text-muted-foreground"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Amount</th></tr></thead><tbody>
            {data.incomes.map((i: any) => <tr key={i.id} className="border-b"><td className="px-3 py-2 text-xs">{formatDateIST(i.date)}</td><td className="px-3 py-2 text-xs">{i.type?.name}</td><td className="px-3 py-2 text-right text-xs text-success">{formatINR(i.amount)}</td></tr>)}
          </tbody></table>
        </Section>
      )}
      {data && selected.includes("expense") && (
        <Section title="Expense Report" empty={data.expenses.length === 0}>
          <table className="w-full"><thead><tr className="border-b text-left text-[11px] uppercase text-muted-foreground"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Vendor</th></tr></thead><tbody>
            {data.expenses.map((e: any) => <tr key={e.id} className="border-b"><td className="px-3 py-2 text-xs">{formatDateIST(e.date)}</td><td className="px-3 py-2 text-xs">{e.type?.name}</td><td className="px-3 py-2 text-right text-xs text-danger">{formatINR(e.amount)}</td><td className="px-3 py-2 text-xs">{e.vendor}</td></tr>)}
          </tbody></table>
        </Section>
      )}

      {/* History Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2"><History className="h-4 w-4" /> Reports Generated History</h2>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Last 10 Reports</span>
        </div>
        
        {loadingHistory ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-navy" /></div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No history found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-xl border border-border bg-card p-4 transition hover:shadow-md group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{formatDateTimeIST(h.created_at)}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteHistory(h.id)} className="p-1 text-danger hover:bg-danger/10 rounded"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
                <div className="mt-1 text-xs font-medium">
                  {h.selected.map((s: string) => TYPES.find(t => t.id === s)?.label).join(" • ")}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Period: {h.from ? formatDateIST(h.from) : "Start"} — {h.to ? formatDateIST(h.to) : "End"}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => loadFromHistory(h, "view")} className="flex-1 rounded-md border border-border bg-muted/50 py-1.5 text-[10px] font-bold uppercase tracking-tight hover:bg-gold hover:text-white transition">View</button>
                  <button onClick={() => loadFromHistory(h, "print")} className="rounded-md border border-border p-1.5 hover:bg-muted"><Printer className="h-3.5 w-3.5" /></button>
                  <button onClick={() => loadFromHistory(h, "download")} className="rounded-md border border-border p-1.5 hover:bg-muted"><Download className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const inp = "w-full rounded-md border border-input bg-muted px-3 py-2 text-sm outline-none focus:border-navy";
function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {empty ? <p className="text-sm text-muted-foreground">No records in this period.</p> : <div className="overflow-x-auto">{children}</div>}
    </section>
  );
}
