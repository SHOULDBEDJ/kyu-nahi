import { type ReactNode } from "react";

const tones = {
  success:  "bg-success-bg text-success-fg",
  warning:  "bg-warning-bg text-warning-fg",
  danger:   "bg-danger-bg text-danger-fg",
  info:     "bg-info-bg text-info-fg",
  navy:     "bg-navy text-white",
  neutral:  "bg-muted text-muted-foreground",
} as const;

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
