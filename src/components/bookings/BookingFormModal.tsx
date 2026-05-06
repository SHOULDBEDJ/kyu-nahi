import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Modal } from "@/components/ui-bits/Modal";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/db";
import { hasConflict, type SlotDef, type BookingLite } from "@/lib/slots";
import { todayIST } from "@/lib/format";

interface FormValues {
  booking_date: string; slot_id: string; customer_name: string; mobile: string;
  id_proof_type?: "Aadhaar"|"PAN"|"Passport"|"DL"|"VoterID"|"";
  id_proof_number?: string; guests: number;
  agreed_total: number; advance_paid: number; discount: number;
  status: "Confirmed"|"Pending"|"Cancelled"; notes?: string;
}

export interface BookingFormData extends FormValues { id?: string; }

export function BookingFormModal({
  open, onClose, onSaved, initial,
}: { open: boolean; onClose: () => void; onSaved: () => void; initial?: BookingFormData | null }) {
  const [slots, setSlots] = useState<SlotDef[]>([]);
  const [allBookings, setAllBookings] = useState<BookingLite[]>([]);
  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      booking_date: todayIST(), slot_id: "", customer_name: "", mobile: "",
      id_proof_type: "", id_proof_number: "", guests: 1,
      agreed_total: 0, advance_paid: 0, discount: 0, status: "Confirmed", notes: "",
    },
  });

  const watched = watch();
  const balance = Number(watched.agreed_total || 0) - Number(watched.advance_paid || 0) - Number(watched.discount || 0);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: s }, { data: b }] = await Promise.all([
        supabase.from("time_slots").select("*").order("start_time"),
        supabase.from("bookings").select("id, booking_date, status, slot:time_slots(*)").is("deleted_at", null),
      ]);
      setSlots((s ?? []) as any);
      setAllBookings((b ?? []) as any);
      if (initial) reset(initial as any);
      else reset({
        booking_date: todayIST(), slot_id: "", customer_name: "", mobile: "",
        id_proof_type: "", id_proof_number: "", guests: 1,
        agreed_total: 0, advance_paid: 0, discount: 0, status: "Confirmed", notes: "",
      });
    })();
  }, [open, initial, reset]);

  const availability = useMemo(() => {
    if (!watched.booking_date || !watched.slot_id) return null;
    const slot = slots.find((s) => s.id === watched.slot_id);
    if (!slot) return null;
    const conflict = hasConflict(watched.booking_date, slot, allBookings, initial?.id);
    return conflict ? { ok: false } : { ok: true };
  }, [watched.booking_date, watched.slot_id, slots, allBookings, initial?.id]);

  const onSubmit = async (vals: FormValues) => {
    if (vals.status === "Confirmed" && availability && !availability.ok) {
      toast.error("This slot is already booked for the selected date.");
      return;
    }
    const payload: any = {
      booking_date: vals.booking_date, slot_id: vals.slot_id,
      customer_name: vals.customer_name, mobile: vals.mobile,
      id_proof_type: vals.id_proof_type || null,
      id_proof_number: vals.id_proof_number || null,
      guests: Number(vals.guests),
      agreed_total: Number(vals.agreed_total),
      advance_paid: Number(vals.advance_paid),
      discount: Number(vals.discount),
      status: vals.status, notes: vals.notes || null,
    };
    if (initial?.id) {
      const { error } = await supabase.from("bookings").update(payload).eq("id", initial.id);
      if (error) return toast.error(error.message);
      await logActivity("Edit", "Bookings", `Updated booking ${initial.id}`);
      toast.success("Booking updated");
    } else {
      const { data: u } = await supabase.auth.getUser();
      payload.created_by = u.user?.id;
      const { error, data } = await supabase.from("bookings").insert(payload).select("order_id").single();
      if (error) return toast.error(error.message);
      await logActivity("Create", "Bookings", `Created booking ${data?.order_id}`);
      toast.success(`Booking ${data?.order_id} created`);
    }
    onSaved(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? "Edit Booking" : "Add Booking"} size="lg"
      footer={
        <>
          <button onClick={onClose} type="button" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
          <button form="booking-form" type="submit" disabled={isSubmitting} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-hover disabled:opacity-50">
            {isSubmitting ? "Saving…" : "Save Booking"}
          </button>
        </>
      }>
      <form id="booking-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Booking Date *" error={errors.booking_date?.message}>
          <input type="date" {...register("booking_date", { required: "Required" })} className={inputCls} />
        </Field>
        <Field label="Time Slot *" error={errors.slot_id?.message}>
          <select {...register("slot_id", { required: "Required" })} className={inputCls}>
            <option value="">Select slot</option>
            {slots.map((s) => <option key={s.id} value={s.id}>{s.name} ({fmt(s.start_time)}–{fmt(s.end_time)})</option>)}
          </select>
          {availability && (
            <div className={`mt-1 text-xs font-medium ${availability.ok ? "text-success" : "text-danger"}`}>
              {availability.ok ? "Available ✓" : "Not Available ✗"}
            </div>
          )}
        </Field>
        <Field label="Full Name *" error={errors.customer_name?.message}>
          <input {...register("customer_name", { required: "Required" })} className={inputCls} />
        </Field>
        <Field label="Mobile *" error={errors.mobile?.message}>
          <div className="flex">
            <span className="rounded-l-md border border-r-0 border-input bg-muted px-3 py-2 text-sm">+91</span>
            <input type="tel" inputMode="numeric" maxLength={10} {...register("mobile", { required: "Required", pattern: { value: /^\d{10}$/, message: "10 digits" } })} className={inputCls + " rounded-l-none"} />
          </div>
        </Field>
        <Field label="ID Proof Type">
          <select {...register("id_proof_type")} className={inputCls}>
            <option value="">None</option>
            <option value="Aadhaar">Aadhaar</option><option value="PAN">PAN</option>
            <option value="Passport">Passport</option><option value="DL">Driving License</option>
            <option value="VoterID">Voter ID</option>
          </select>
        </Field>
        <Field label="ID Number">
          <input {...register("id_proof_number")} className={inputCls} />
        </Field>
        <Field label="Number of Guests *" error={errors.guests?.message}>
          <input type="number" inputMode="numeric" min={1} {...register("guests", { required: "Required", min: { value: 1, message: "Min 1" } })} className={inputCls} />
        </Field>
        <Field label="Status">
          <select {...register("status")} className={inputCls}>
            <option>Confirmed</option><option>Pending</option><option>Cancelled</option>
          </select>
        </Field>
        <Field label="Agreed Total ₹ *" error={errors.agreed_total?.message}>
          <input type="number" inputMode="decimal" min={0} step="0.01" {...register("agreed_total", { required: "Required", valueAsNumber: true })} className={inputCls} />
        </Field>
        <Field label="Advance Paid ₹">
          <input type="number" inputMode="decimal" min={0} step="0.01" {...register("advance_paid", { valueAsNumber: true })} className={inputCls} />
        </Field>
        <Field label="Discount ₹">
          <input type="number" inputMode="decimal" min={0} step="0.01" {...register("discount", { valueAsNumber: true })} className={inputCls} />
        </Field>
        <Field label="Remaining Balance ₹">
          <input value={balance.toFixed(2)} readOnly className={inputCls + " bg-muted/50 font-semibold"} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <textarea rows={3} {...register("notes")} className={inputCls} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

const inputCls = "w-full rounded-md border border-input bg-muted px-3 py-2 text-base outline-none focus:border-navy";
function fmt(t: string) { const [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; const hh = ((h + 11) % 12) + 1; return `${hh}:${String(m).padStart(2, "0")} ${ap}`; }

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-danger">{error}</span>}
    </label>
  );
}
