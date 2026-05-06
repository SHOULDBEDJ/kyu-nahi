import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Settings as SetIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/db";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings | 16 Eyes Farm House" }] }),
  component: SettingsPage,
});

interface S {
  farmhouse_name: string; phone: string | null; email: string | null; address: string | null;
  business_name: string | null; business_phone: string | null; business_email: string | null; business_address: string | null; gst_number: string | null;
  tax_percent: number | null; default_booking_notes: string | null;
  notify_bookings: boolean; notify_payments: boolean; notify_daily_summary: boolean;
}

function SettingsPage() {
  const [s, setS] = useState<S | null>(null);
  const [slots, setSlots] = useState<any[]>([]);

  const load = async () => {
    const [{ data: st }, { data: sl }] = await Promise.all([
      supabase.from("settings").select("*").maybeSingle(),
      supabase.from("time_slots").select("*").order("start_time"),
    ]);
    if (st) setS(st as any);
    setSlots(sl ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (patch: Partial<S>) => {
    const { error } = await supabase.from("settings").update(patch).eq("id", 1);
    if (error) return toast.error(error.message);
    await logActivity("Settings Updated", "Settings", Object.keys(patch).join(", "));
    toast.success("Saved"); load();
  };

  if (!s) return <div className="h-40 animate-pulse rounded-md bg-muted" />;

  return (
    <div className="space-y-5">
      <PageHeader icon={SetIcon} title="Settings" subtitle="Configure farmhouse and system preferences" />

      <Section title="Farmhouse Identity">
        <Grid>
          <Field label="Name"><input defaultValue={s.farmhouse_name} onBlur={(e) => save({ farmhouse_name: e.target.value })} className={inp}/></Field>
          <Field label="Phone"><input defaultValue={s.phone ?? ""} onBlur={(e) => save({ phone: e.target.value })} className={inp}/></Field>
          <Field label="Email"><input defaultValue={s.email ?? ""} onBlur={(e) => save({ email: e.target.value })} className={inp}/></Field>
          <Field label="Address"><input defaultValue={s.address ?? ""} onBlur={(e) => save({ address: e.target.value })} className={inp}/></Field>
        </Grid>
      </Section>

      <Section title="Business Details (for receipts/PDFs)">
        <Grid>
          <Field label="Business Name"><input defaultValue={s.business_name ?? ""} onBlur={(e) => save({ business_name: e.target.value })} className={inp}/></Field>
          <Field label="Business Phone"><input defaultValue={s.business_phone ?? ""} onBlur={(e) => save({ business_phone: e.target.value })} className={inp}/></Field>
          <Field label="Business Email"><input defaultValue={s.business_email ?? ""} onBlur={(e) => save({ business_email: e.target.value })} className={inp}/></Field>
          <Field label="GST Number"><input defaultValue={s.gst_number ?? ""} onBlur={(e) => save({ gst_number: e.target.value })} className={inp}/></Field>
          <div className="sm:col-span-2"><Field label="Business Address"><textarea rows={2} defaultValue={s.business_address ?? ""} onBlur={(e) => save({ business_address: e.target.value })} className={inp}/></Field></div>
        </Grid>
      </Section>

      <Section title="Booking Preferences">
        <Grid>
          <Field label="Currency"><input value="INR (₹)" disabled className={inp + " opacity-60"}/></Field>
          <Field label="Tax %"><input type="number" min={0} step="0.01" defaultValue={s.tax_percent ?? 0} onBlur={(e) => save({ tax_percent: Number(e.target.value) } as any)} className={inp}/></Field>
        </Grid>
      </Section>

      <Section title="Time Slots">
        <ul className="space-y-2">
          {slots.map((sl) => (
            <li key={sl.id} className="flex items-center gap-3 rounded-md border border-border p-2">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: sl.color }}/>
              <span className="flex-1 text-sm font-medium">{sl.name}</span>
              <span className="text-xs text-muted-foreground">{sl.start_time}–{sl.end_time}</span>
              {sl.is_overnight && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] text-warning-fg">overnight</span>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">5 default slots are pre-configured.</p>
      </Section>

      <Section title="Notifications">
        <div className="space-y-2">
          {(["notify_bookings","notify_payments","notify_daily_summary"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked={!!s[k]} onChange={(e) => save({ [k]: e.target.checked } as any)} className="h-4 w-4"/>
              {k.replace("notify_", "").replace("_", " ")}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Default Booking Notes (for receipts)">
        <textarea rows={4} maxLength={1000} defaultValue={s.default_booking_notes ?? ""} onBlur={(e) => save({ default_booking_notes: e.target.value })} className={inp}/>
      </Section>
    </div>
  );
}

const inp = "w-full rounded-md border border-input bg-muted px-3 py-2 text-base outline-none focus:border-navy";
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-5"><h2 className="mb-3 text-sm font-semibold">{title}</h2>{children}</section>;
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium">{label}</span>{children}</label>;
}
