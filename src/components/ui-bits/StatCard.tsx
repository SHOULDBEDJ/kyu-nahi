import { type LucideIcon } from "lucide-react";

type Tone = "gold" | "success" | "info" | "danger" | "navy";
const tones: Record<Tone, { bg: string; fg: string; accent: boolean }> = {
  gold:    { bg: "bg-warning-bg",  fg: "text-warning-fg", accent: true  },
  success: { bg: "bg-success-bg",  fg: "text-success-fg", accent: false },
  info:    { bg: "bg-info-bg",     fg: "text-info-fg",    accent: false },
  danger:  { bg: "bg-danger-bg",   fg: "text-danger-fg",  accent: false },
  navy:    { bg: "bg-navy/10",     fg: "text-navy",       accent: false },
};

export function StatCard({
  icon: Icon, label, value, tone = "navy",
}: { icon: LucideIcon; label: string; value: string | number; tone?: Tone }) {
  const t = tones[tone];
  return (
    <div className={`relative flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm ${t.accent ? "border-l-4 border-l-gold" : ""}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-md ${t.bg}`}>
        <Icon size={20} className={t.fg} strokeWidth={1.75} />
      </div>
      <div>
        <div className="text-[28px] font-bold leading-none text-foreground">{value}</div>
        <div className="mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
