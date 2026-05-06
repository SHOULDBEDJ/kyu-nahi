import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Settings as SetIcon,
  List,
  LayoutGrid,
} from "lucide-react";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { StatCard } from "@/components/ui-bits/StatCard";
import { EmptyState } from "@/components/ui-bits/EmptyState";
import { ConfirmDialog } from "@/components/ui-bits/ConfirmDialog";
import { Modal } from "@/components/ui-bits/Modal";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/db";
import { formatINR, formatDateIST, todayIST } from "@/lib/format";

export const Route = createFileRoute("/_app/income")({
  head: () => ({ meta: [{ title: "Income | 16 Eyes Farm House" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new === true || search.new === "true",
  }),
  component: IncomePage,
});

interface IncomeRow {
  id: string;
  date: string;
  amount: number;
  payment_mode: string;
  reference: string | null;
  description: string | null;
  type: { id: string; name: string } | null;
}
interface TypeRow {
  id: string;
  name: string;
}
interface FormVals {
  date: string;
  type_id: string;
  amount: number;
  payment_mode: string;
  reference?: string;
  description?: string;
}

function IncomePage() {
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IncomeRow | null>(null);
  const [delTarget, setDelTarget] = useState<IncomeRow | null>(null);
  const [showTypes, setShowTypes] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormVals>();

  const load = async () => {
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase
        .from("incomes")
        .select("*, type:income_types(id, name)")
        .is("deleted_at", null)
        .order("date", { ascending: false }),
      supabase.from("income_types").select("*").order("name"),
    ]);
    setRows((r ?? []) as any);
    setTypes((t ?? []) as any);
  };
  const { new: autoAdd } = Route.useSearch();
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (autoAdd && types.length > 0) open();
  }, [autoAdd, types]);

  const open = (i?: IncomeRow) => {
    setEditing(i ?? null);
    reset(
      i
        ? {
            date: i.date,
            type_id: i.type?.id ?? "",
            amount: i.amount,
            payment_mode: i.payment_mode,
            reference: i.reference ?? "",
            description: i.description ?? "",
          }
        : {
            date: todayIST(),
            type_id: types[0]?.id ?? "",
            amount: 0,
            payment_mode: "Cash",
            reference: "",
            description: "",
          },
    );
    setShowForm(true);
  };

  const onSubmit = async (v: FormVals) => {
    const payload: any = { ...v, amount: Number(v.amount) };
    if (editing) {
      const { error } = await supabase.from("incomes").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await logActivity("Edit", "Income", `Updated income`);
      toast.success("Income updated");
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("incomes")
        .insert({ ...payload, created_by: u.user?.id });
      if (error) return toast.error(error.message);
      await logActivity("Create", "Income", `Added income ${formatINR(v.amount)}`);
      toast.success("Income added");
    }
    setShowForm(false);
    load();
  };

  const doDel = async () => {
    if (!delTarget) return;
    await supabase
      .from("incomes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", delTarget.id);
    await logActivity("Delete", "Income", `Deleted income ${formatINR(delTarget.amount)}`);
    toast.success("Deleted");
    setDelTarget(null);
    load();
  };

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const [view, setView] = useState<"table" | "cards">("table");
  const filtered = rows; // Search logic can be added here if needed

  return (
    <div className="space-y-5">
      <PageHeader
        icon={DollarSign}
        title="Income"
        subtitle="Track other sources of income"
        action={
          <div className="flex gap-2">
            <div className="flex rounded-md border border-input bg-card">
              <button
                onClick={() => setView("table")}
                className={`px-3 py-2 ${view === "table" ? "bg-gold text-white" : ""}`}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setView("cards")}
                className={`px-3 py-2 ${view === "cards" ? "bg-gold text-white" : ""}`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>
            <button
              onClick={() => setShowTypes(true)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
            >
              <SetIcon size={14} /> Manage Types
            </button>
            <button
              onClick={() => open()}
              disabled={types.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm text-white hover:bg-navy-hover disabled:opacity-50"
            >
              <Plus size={16} /> Add Income
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={DollarSign} label="Total Income" value={formatINR(total)} tone="success" />
        <StatCard icon={DollarSign} label="Records" value={rows.length} tone="navy" />
        <StatCard icon={DollarSign} label="Types" value={types.length} tone="gold" />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No income recorded"
          subtitle={
            types.length === 0
              ? "Create at least one income type first."
              : "Add your first income entry."
          }
          action={
            types.length === 0 ? (
              <button
                onClick={() => setShowTypes(true)}
                className="rounded-md bg-navy px-4 py-2 text-sm text-white"
              >
                Manage Types
              </button>
            ) : (
              <button
                onClick={() => open()}
                className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm text-white"
              >
                <Plus size={14} /> Add Income
              </button>
            )
          }
        />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3 text-sm">{formatDateIST(i.date)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                      {i.type?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-success">
                    {formatINR(i.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm">{i.payment_mode}</td>
                  <td className="px-4 py-3 text-sm">{i.reference ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {i.description ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => open(i)} className="rounded p-1.5 hover:bg-muted">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDelTarget(i)}
                        className="rounded p-1.5 text-danger hover:bg-muted"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-background">
                <td colSpan={2} className="px-4 py-3 text-right text-sm font-semibold">
                  Total
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-success">
                  {formatINR(total)}
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((i) => (
            <div
              key={i.id}
              className="rounded-xl border border-border bg-card p-4 transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {formatDateIST(i.date)}
                </span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                  {i.type?.name}
                </span>
              </div>
              <div className="mt-2 text-lg font-bold text-success">{formatINR(i.amount)}</div>
              <div className="mt-1 text-sm font-medium">{i.payment_mode}</div>
              {i.reference && (
                <div className="text-xs text-muted-foreground">Ref: {i.reference}</div>
              )}
              {i.description && (
                <p className="mt-2 text-xs line-clamp-2 text-muted-foreground italic">
                  "{i.description}"
                </p>
              )}
              <div className="mt-4 flex gap-2 border-t border-border pt-3">
                <button
                  onClick={() => open(i)}
                  className="flex-1 rounded-md border border-border py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDelTarget(i)}
                  className="flex-1 rounded-md border border-danger/20 py-1.5 text-xs font-medium text-danger hover:bg-danger hover:text-white transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Income" : "Add Income"}
        footer={
          <>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              form="income-form"
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-navy px-4 py-2 text-sm text-white"
            >
              Save
            </button>
          </>
        }
      >
        <form
          id="income-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label="Date *">
            <input type="date" {...register("date", { required: true })} className={inp} />
          </Field>
          <Field label="Type *">
            <select {...register("type_id", { required: true })} className={inp}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount ₹ *">
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step="0.01"
              {...register("amount", { required: true, valueAsNumber: true })}
              className={inp}
            />
          </Field>
          <Field label="Payment Mode">
            <select {...register("payment_mode")} className={inp}>
              <option>UPI</option>
              <option>Cash</option>
              <option>Cheque</option>
              <option>BankTransfer</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Reference">
            <input {...register("reference")} className={inp} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea rows={3} maxLength={500} {...register("description")} className={inp} />
            </Field>
          </div>
        </form>
      </Modal>

      <TypeManager
        open={showTypes}
        onClose={() => setShowTypes(false)}
        table="income_types"
        usageTable="incomes"
        types={types}
        reload={load}
      />
      <ConfirmDialog
        open={!!delTarget}
        title="Delete income?"
        body="This action cannot be undone."
        confirmLabel="Delete"
        danger
        onCancel={() => setDelTarget(null)}
        onConfirm={doDel}
      />
    </div>
  );
}

const inp =
  "w-full rounded-md border border-input bg-muted px-3 py-2 text-base outline-none focus:border-navy";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}

export function TypeManager({
  open,
  onClose,
  table,
  usageTable,
  types,
  reload,
}: {
  open: boolean;
  onClose: () => void;
  table: "income_types" | "expense_types";
  usageTable: "incomes" | "expenses";
  types: TypeRow[];
  reload: () => void;
}) {
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from(table).insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    await logActivity(
      "Type Added",
      table === "income_types" ? "Income" : "Expenses",
      `Type "${name}"`,
    );
    setName("");
    reload();
  };
  const save = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from(table).update({ name: editName.trim() }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditId(null);
    reload();
  };
  const del = async (t: TypeRow) => {
    try {
      // 1. Check if category is in use
      const { data: usage } = await supabase
        .from(usageTable)
        .select("id")
        .eq("type_id", t.id)
        .is("deleted_at", null)
        .limit(1);

      if (usage && usage.length > 0) {
        const confirm = window.confirm(
          `This category is used in your records. To delete it, we will move those records to "Other". Continue?`,
        );
        if (!confirm) return;

        // 2. Ensure "Other" category exists
        let { data: otherType } = await supabase
          .from(table)
          .select("id")
          .eq("name", "Other")
          .maybeSingle();
        if (!otherType) {
          const { data: newOther, error: createErr } = await supabase
            .from(table)
            .insert({ name: "Other" })
            .select("id")
            .single();
          if (createErr) throw createErr;
          otherType = newOther;
        }

        // 3. Reassign ALL records to "Other" (including soft-deleted ones)
        const { error: moveErr } = await supabase
          .from(usageTable)
          .update({ type_id: otherType.id })
          .eq("type_id", t.id);
        if (moveErr) throw moveErr;
      }

      // 4. Finally delete the category
      const { error } = await supabase.from(table).delete().eq("id", t.id);
      if (error) throw error;

      await logActivity(
        "Type Deleted",
        table === "income_types" ? "Income" : "Expenses",
        `Removed "${t.name}"`,
      );
      toast.success("Category removed and records updated");
      reload();
    } catch (e: any) {
      toast.error("Cleanup failed: " + e.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage Types">
      <ul className="space-y-2">
        {types.map((t) => (
          <li key={t.id} className="flex items-center gap-2 rounded-md border border-border p-2">
            {editId === t.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inp + " flex-1"}
                />
                <button
                  onClick={() => save(t.id)}
                  className="rounded-md bg-navy px-3 py-1.5 text-xs text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{t.name}</span>
                <button
                  onClick={() => {
                    setEditId(t.id);
                    setEditName(t.name);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-navy"
                >
                  <Pencil size={14} />
                </button>
                <button onClick={() => del(t)} className="p-1.5 text-danger">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New type name"
          className={inp + " flex-1"}
        />
        <button onClick={add} className="rounded-md bg-navy px-4 py-2 text-sm text-white">
          Add
        </button>
      </div>
    </Modal>
  );
}
