import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export function PageHeader({
  icon: Icon, title, subtitle, action,
}: { icon: LucideIcon; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-gold"><Icon size={26} strokeWidth={1.75} /></div>
        <div>
          <h1 className="text-2xl font-semibold leading-tight text-gold">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
