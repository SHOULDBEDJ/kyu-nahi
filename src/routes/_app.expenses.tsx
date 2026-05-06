import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Receipt, Plus, Pencil, Trash2, Settings as SetIcon } from "lucide-react";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { StatCard } from "@/components/ui-bits/StatCard";
import { EmptyState } from "@/components/ui-bits/EmptyState";
import { ConfirmDialog } from "@/components/ui-bits/ConfirmDialog";
import { Modal } from "@/components/ui-bits/Modal";
import { TypeManager } from "@/routes/_app.income";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/db";
import { formatINR, formatDateIST, todayIST } from "@/lib/format";

export const Route = createFileRoute("/_app/expenses")({
  head: () => ({ meta: [{ title: "Expenses | 16 Eyes Farm House" }] }),
  component: ExpensesPage,
});

interface ExpRow { id: string; date: string; amount: number; payment_mode: string; vendor: string | null; reference: string | null; description: string | null; type: { id: string; name: string } | null; }
interface TypeRow { id: string; name: string; }
interface FormVals { date: string; type_id: string; amount: number; payment_mode: string; vendor?: string; reference?: string; description?: string; }

function ExpensesPage() {
  const [rows, setRows] = useState<ExpRow[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExpRow | null>(null);
  const [delTarget, setDelTarget] = useState<ExpRow | null>(null);
  const [showTypes, setShowTypes] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormVals>();

  const load = async () => {
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase.from("expenses").select("*, type:expense_types(id, name)").is("deleted_at", null).order("date", { ascending: false }),
      supabase.from("expense_types").select("*").order("name"),
    ]);
    setRows((r ?? []) as any); setTypes((t ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const open = (i?: ExpRow) => {
    setEditing(i ?? null);
    reset(i ? { date: i.date, type_id: i.type?.id ?? "", amount: i.amount, payment_mode: i.payment_mode, vendor: i.vendor ?? "", reference: i.reference ?? "", description: i.description ?? "" }
            : { date: todayIST(), type_id: types[0]?.id ?? "", amount: 0, payment_mode: "Cash", vendor: "", reference: "", description: "" });
    setShowForm(true);
  };

  const onSubmit = async (v: FormVals) => {
    const payload: any = { ...v, amount: Number(v.amount) };
    if (editing) {
      const { error } = await supabase.from("expenses").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await logActivity("Edit", "Expenses", `Updated expense`);
      toast.success("Expense updated");
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses").insert({ ...payload, created_by: u.user?.id });
      if (error) return toast.error(error.message);
      await logActivity("Create", "Expenses", `Added expense ${formatINR(v.amount)}`);
      toast.success("Expense added");
    }
    setShowForm(false); load();
  };

  const doDel = async () => {
    if (!delTarget) return;
    await supabase.from("expenses").update({ deleted_at: new Date().toISOString() }).eq("id", delTarget.id);
    await logActivity("Delete", "Expenses", `Deleted expense`);
    toast.success("Deleted"); setDelTarget(null); load();
  };

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-5">
      <PageHeader icon={Receipt} title="Expenses" subtitle="Track operational expenses"
        action={<div className="flex gap-2"><button onClick={() => setShowTypes(true)} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"><SetIcon size={14}/> Manage Types</button><button onClick={() => open()} disabled={types.length===0} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm text-white hover:bg-navy-hover disabled:opacity-50"><Plus size={16}/> Add Expense</button></div>} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={Receipt} label="Total Expenses" value={formatINR(total)} tone="danger" />
        <StatCard icon={Receipt} label="Records" value={rows.length} tone="navy" />
        <StatCard icon={Receipt} label="Types" value={types.length} tone="gold" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses recorded" subtitle="Add your first expense to start tracking."
          action={<button onClick={() => open()} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm text-white"><Plus size={14}/> Add Expense</button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[700px]">
            <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Payment</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Description</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3 text-sm">{formatDateIST(e.date)}</td>
                  <td className="px-4 py-3 text-sm"><span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning-fg">{e.type?.name}</span></td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-danger">{formatINR(e.amount)}</td>
                  <td className="px-4 py-3 text-sm">{e.payment_mode}</td>
                  <td className="px-4 py-3 text-sm">{e.vendor ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{e.description ?? "-"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => open(e)} className="rounded p-1.5 hover:bg-muted"><Pencil size={14}/></button><button onClick={() => setDelTarget(e)} className="rounded p-1.5 text-danger hover:bg-muted"><Trash2 size={14}/></button></div></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-background"><td colSpan={2} className="px-4 py-3 text-right text-sm font-semibold">Total</td><td className="px-4 py-3 text-right text-sm font-bold text-danger">{formatINR(total)}</td><td colSpan={4}/></tr></tfoot>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Expense" : "Add Expense"}
        footer={<><button onClick={() => setShowForm(false)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button><button form="exp-form" type="submit" disabled={isSubmitting} className="rounded-md bg-navy px-4 py-2 text-sm text-white">Save</button></>}>
        <form id="exp-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date *"><input type="date" {...register("date", { required: true })} className={inp}/></Field>
          <Field label="Type *"><select {...register("type_id", { required: true })} className={inp}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <Field label="Amount ₹ *"><input type="number" inputMode="decimal" min={1} step="0.01" {...register("amount", { required: true, valueAsNumber: true })} className={inp}/></Field>
          <Field label="Payment Mode"><select {...register("payment_mode")} className={inp}><option>Cash</option><option>UPI</option><option>Cheque</option><option>BankTransfer</option><option>Other</option></select></Field>
          <Field label="Vendor"><input {...register("vendor")} className={inp}/></Field>
          <Field label="Reference"><input {...register("reference")} className={inp}/></Field>
          <div className="sm:col-span-2"><Field label="Description"><textarea rows={3} maxLength={500} {...register("description")} className={inp}/></Field></div>
        </form>
      </Modal>

      <TypeManager open={showTypes} onClose={() => setShowTypes(false)} table="expense_types" usageTable="expenses" types={types} reload={load} />
      <ConfirmDialog open={!!delTarget} title="Delete expense?" body="This action cannot be undone." confirmLabel="Delete" danger onCancel={() => setDelTarget(null)} onConfirm={doDel} />
    </div>
  );
}

const inp = "w-full rounded-md border border-input bg-muted px-3 py-2 text-base outline-none focus:border-navy";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium">{label}</span>{children}</label>;
}
