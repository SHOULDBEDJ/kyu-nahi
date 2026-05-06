import { useEffect } from "react";
import { X } from "lucide-react";

export function ConfirmDialog({
  open, title, body, confirmLabel = "Confirm", danger, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        {body && <div className="px-5 py-5 text-sm text-muted-foreground">{body}</div>}
        <div className="flex justify-end gap-2 border-t border-border bg-card px-5 py-3">
          <button onClick={onCancel} className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${danger ? "bg-maroon hover:opacity-90" : "bg-navy hover:bg-navy-hover"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
