// Empty state with simple illustration
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon, title, subtitle, action,
}: { icon: LucideIcon; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon size={28} className="text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-medium">{title}</h3>
      {subtitle && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
