// Indian number formatting + IST date utilities
const IST_TZ = "Asia/Kolkata";

export function formatINR(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return "₹0";
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function dateInIST(input: string | Date): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  return d;
}

export function formatDateIST(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = dateInIST(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { timeZone: IST_TZ, day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTimeIST(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = dateInIST(iso);
  if (isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-GB", { timeZone: IST_TZ, day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { timeZone: IST_TZ, hour12: false });
  return `${date} ${time} IST`;
}

export function formatMonthYear(iso: string | Date): string {
  const d = dateInIST(iso);
  return d.toLocaleDateString("en-GB", { timeZone: IST_TZ, month: "short", year: "numeric" });
}

/** Today's date in IST as YYYY-MM-DD (for date inputs and DB date fields). */
export function todayIST(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: IST_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(new Date());
}

/** Returns true if the given YYYY-MM-DD string equals today in IST. */
export function isTodayIST(d: string): boolean { return d === todayIST(); }

/** Year and month (1-12) in IST */
export function nowYearMonthIST(): { y: number; m: number } {
  const t = todayIST();
  return { y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) };
}

/** Returns Monday-Sunday range (IST) containing today as [start, end] inclusive YYYY-MM-DD */
export function thisWeekRangeIST(): [string, string] {
  const today = new Date(todayIST() + "T00:00:00");
  const dow = (today.getDay() + 6) % 7; // make Monday = 0
  const start = new Date(today); start.setDate(today.getDate() - dow);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return [fmt(start), fmt(end)];
}

const AVATAR_PALETTE = [
  "bg-[#1a237e]", "bg-[#27ae60]", "bg-[#f5a623]", "bg-[#c0392b]",
  "bg-[#7e57c2]", "bg-[#00838f]", "bg-[#ff7043]", "bg-[#546e7a]",
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function passwordStrength(pw: string): { label: string; color: string; pct: number } {
  if (pw.length < 6) return { label: "Weak", color: "bg-danger", pct: 33 };
  const hasNum = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  if (pw.length >= 8 && hasNum && hasSpecial) return { label: "Strong", color: "bg-success", pct: 100 };
  return { label: "Fair", color: "bg-warning", pct: 66 };
}
