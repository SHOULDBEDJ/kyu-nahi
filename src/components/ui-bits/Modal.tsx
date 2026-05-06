// Modal wrapper — full-screen on mobile, centered on desktop
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open, onClose, title, children, footer, size = "md",
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "md" | "lg" | "xl" }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!open) return null;
  const w = size === "xl" ? "sm:max-w-3xl" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg";
  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative flex h-full w-full flex-col bg-card shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl ${w}`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border bg-background px-5 py-3 sm:rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}
