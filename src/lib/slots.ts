// Time slot conflict detection using strict interval overlap.
// Back-to-back is allowed: conflict only when new_start < existing_end AND new_end > existing_start.

export interface SlotDef {
  id: string;
  name: string;
  start_time: string; // "HH:MM:SS" or "HH:MM"
  end_time: string;
  color: string;
  is_overnight: boolean;
}

export interface BookingLite {
  id?: string;
  booking_date: string; // YYYY-MM-DD
  status: string;
  slot: SlotDef;
}

/** Returns [startMs, endMs] for a booking date+slot. Overnight slots span to next day. */
export function occupancyMs(bookingDate: string, slot: SlotDef): [number, number] {
  const [sh, sm] = slot.start_time.split(":").map(Number);
  const [eh, em] = slot.end_time.split(":").map(Number);
  // Use UTC arithmetic so timezone shifts don't interfere — we treat the date+time as a wall clock.
  const start = new Date(`${bookingDate}T00:00:00Z`);
  start.setUTCHours(sh, sm, 0, 0);
  const end = new Date(`${bookingDate}T00:00:00Z`);
  end.setUTCHours(eh, em, 0, 0);
  if (slot.is_overnight || end.getTime() <= start.getTime()) end.setUTCDate(end.getUTCDate() + 1);
  return [start.getTime(), end.getTime()];
}

/** True if the new (date,slot) conflicts with any existing CONFIRMED booking. */
export function hasConflict(
  newDate: string,
  newSlot: SlotDef,
  existing: BookingLite[],
  ignoreId?: string,
): boolean {
  const [ns, ne] = occupancyMs(newDate, newSlot);
  for (const b of existing) {
    if (b.status !== "Confirmed") continue;
    if (ignoreId && b.id === ignoreId) continue;
    const [es, ee] = occupancyMs(b.booking_date, b.slot);
    if (ns < ee && ne > es) return true;
  }
  return false;
}
