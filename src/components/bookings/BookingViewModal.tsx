import { Modal } from "@/components/ui-bits/Modal";
import { formatINR, formatDateIST } from "@/lib/format";
import { Printer, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export interface ViewBooking {
  id: string; order_id: string; customer_name: string; mobile: string;
  id_proof_type: string | null; id_proof_number: string | null; guests: number;
  booking_date: string; agreed_total: number; advance_paid: number; discount: number;
  status: string; notes: string | null; created_at: string;
  slot: { name: string; color: string; start_time: string; end_time: string } | null;
}

export function BookingViewModal({
  open, onClose, booking, farmhouse,
}: { open: boolean; onClose: () => void; booking: ViewBooking | null; farmhouse: { name: string; address?: string; phone?: string; notes?: string } }) {
  if (!booking) return null;
  const balance = Number(booking.agreed_total) - Number(booking.advance_paid) - Number(booking.discount);

  const printReceipt = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${booking.order_id}</title>
      <style>
        body{font-family:Inter,sans-serif;padding:32px;color:#000;font-size:13px}
        h1{color:#1a237e;margin:0}.hdr{display:flex;justify-content:space-between;border-bottom:2px solid #1a237e;padding-bottom:12px;margin-bottom:16px}
        .logo{width:48px;height:48px;border-radius:50%;background:#f5a623;color:#1a237e;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:20px}
        table{width:100%;border-collapse:collapse;margin:12px 0}
        td{padding:6px;border-bottom:1px solid #eee}
        .label{color:#666;width:40%}
        .total{background:#f5f4ef;font-weight:bold}
        .stamp{margin-top:48px;border-top:1px dashed #999;padding-top:16px;text-align:right;color:#666}
      </style></head><body>
      <div class="hdr">
        <div style="display:flex;gap:12px;align-items:center"><div class="logo">16</div><div><h1>${farmhouse.name}</h1><div style="color:#666">${farmhouse.address ?? ""}</div><div style="color:#666">${farmhouse.phone ?? ""}</div></div></div>
        <div style="text-align:right"><div><strong>${booking.order_id}</strong></div><div style="color:#666">${formatDateIST(new Date().toISOString())}</div></div>
      </div>
      <h2 style="color:#1a237e;font-size:16px">Booking Receipt</h2>
      <table>
        <tr><td class="label">Customer</td><td>${booking.customer_name}</td></tr>
        <tr><td class="label">Mobile</td><td>+91 ${booking.mobile}</td></tr>
        <tr><td class="label">ID Proof</td><td>${booking.id_proof_type ?? "-"} ${booking.id_proof_number ?? ""}</td></tr>
        <tr><td class="label">Booking Date</td><td>${formatDateIST(booking.booking_date)}</td></tr>
        <tr><td class="label">Slot</td><td>${booking.slot?.name ?? "-"}</td></tr>
        <tr><td class="label">Guests</td><td>${booking.guests}</td></tr>
        <tr><td class="label">Agreed Total</td><td>${formatINR(booking.agreed_total)}</td></tr>
        <tr><td class="label">Advance Paid</td><td>${formatINR(booking.advance_paid)}</td></tr>
        <tr><td class="label">Discount</td><td>${formatINR(booking.discount)}</td></tr>
        <tr class="total"><td class="label">Balance Due</td><td>${formatINR(balance)}</td></tr>
      </table>
      ${farmhouse.notes ? `<p style="color:#666;font-size:11px;margin-top:24px;border-top:1px solid #eee;padding-top:12px">${farmhouse.notes}</p>` : ""}
      <div class="stamp">Authorized Signature</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    w.document.close();
  };

  const sendWhatsApp = () => {
    const msg = encodeURIComponent(`Hello ${booking.customer_name}, your booking at 16 Eyes Farm House on ${formatDateIST(booking.booking_date)} (${booking.slot?.name}) is ${booking.status}. Balance due: ${formatINR(balance)}`);
    window.open(`https://wa.me/91${booking.mobile}?text=${msg}`, "_blank");
  };

  const share = async () => {
    const text = `Booking ${booking.order_id} – ${booking.customer_name} – ${formatDateIST(booking.booking_date)} ${booking.slot?.name ?? ""} – Bal ${formatINR(balance)}`;
    try { await navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); } catch { toast.error("Copy failed"); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`${booking.order_id} — ${booking.customer_name}`} size="lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <button onClick={share} className="rounded-md border border-border px-3 py-2 text-sm">Copy</button>
          <button onClick={sendWhatsApp} className="inline-flex items-center gap-1.5 rounded-md border border-success px-3 py-2 text-sm text-success"><MessageCircle size={14}/> WhatsApp</button>
          <button onClick={printReceipt} className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-2 text-sm text-white"><Printer size={14}/> Print Receipt</button>
        </div>
      }>
      <div className="space-y-4 text-sm">
        <Section title="Customer">
          <Row k="Name" v={booking.customer_name} />
          <Row k="Mobile" v={`+91 ${booking.mobile}`} />
          <Row k="ID Proof" v={`${booking.id_proof_type ?? "-"} ${booking.id_proof_number ?? ""}`} />
        </Section>
        <Section title="Booking">
          <Row k="Date" v={formatDateIST(booking.booking_date)} />
          <Row k="Slot" v={<span className="rounded-full px-2 py-0.5 text-[11px] text-white" style={{ backgroundColor: booking.slot?.color ?? "#888" }}>{booking.slot?.name}</span>} />
          <Row k="Guests" v={String(booking.guests)} />
          <Row k="Status" v={booking.status} />
        </Section>
        <Section title="Payment Timeline">
          <div className="space-y-2">
            <Tline label="Agreed Total" value={formatINR(booking.agreed_total)} />
            <Tline label="Advance Paid" value={formatINR(booking.advance_paid)} ok />
            <Tline label="Discount" value={formatINR(booking.discount)} />
            <div className={`flex justify-between rounded-md p-2 ${balance > 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
              <span className="font-semibold">Balance Due</span><span className="font-bold">{formatINR(balance)}</span>
            </div>
          </div>
        </Section>
        {booking.notes && <Section title="Notes"><p className="text-muted-foreground">{booking.notes}</p></Section>}
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>{children}</div>;
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between border-b border-border py-1.5"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}
function Tline({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return <div className="flex justify-between rounded-md bg-muted/50 p-2"><span>{label}</span><span className={`font-medium ${ok ? "text-success" : ""}`}>{value}</span></div>;
}
