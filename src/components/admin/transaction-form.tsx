"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addTransaction,
  type FinanceFormState,
} from "@/lib/admin/finance-actions";
import type { CoachOption } from "@/lib/admin/coach-options";

const INITIAL: FinanceFormState = { status: "idle", message: "" };

const CATEGORIES: Record<"expense" | "income", string[]> = {
  expense: [
    "materiel",
    "equipement",
    "assurance",
    "location",
    "admin",
    "autre",
  ],
  income: ["cotisation", "stage", "sponsor", "subvention", "autre"],
};

function SubmitButton({ label, pending }: { label: string; pending: string }) {
  const status = useFormStatus();
  return (
    <Button type="submit" disabled={status.pending}>
      <Plus className="mr-1 h-4 w-4" />
      {status.pending ? pending : label}
    </Button>
  );
}

export function TransactionForm({
  mode,
  today,
  coaches = [],
}: {
  mode: "expense" | "full";
  today: string;
  coaches?: CoachOption[];
}) {
  const t = useTranslations("Admin.finance");
  const [state, formAction] = useFormState(addTransaction, INITIAL);
  const [kind, setKind] = React.useState<"income" | "expense">("expense");
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  function openPicker(e: React.MouseEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
      } catch {
        /* ignore */
      }
    }
  }

  const labelCls = "text-xs font-medium text-grey-500";
  const fieldCls = "flex flex-col gap-1";
  const activeKind = mode === "expense" ? "expense" : kind;
  const datalistId = `categories-${mode}`;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-5 rounded-2xl border border-grey-100 bg-white p-6 shadow-sm"
    >
      <h2 className="font-anton text-xl uppercase text-navy">
        {mode === "expense" ? t("addExpenseTitle") : t("addTitle")}
      </h2>

      {state.status === "success" && (
        <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-grey-700">
          <CheckCircle2 className="h-5 w-5 text-success" /> {t("success")}
        </p>
      )}

      {mode === "expense" ? (
        <input type="hidden" name="kind" value="expense" />
      ) : (
        <div className={fieldCls}>
          <label className={labelCls}>{t("kind")}</label>
          <div className="flex gap-2">
            {(["expense", "income"] as const).map((k) => (
              <label
                key={k}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  kind === k
                    ? k === "income"
                      ? "border-success bg-success/10 text-success"
                      : "border-error bg-error/10 text-error"
                    : "border-grey-200 text-grey-700 hover:border-grey-300"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="sr-only"
                />
                {t(`kind_${k}`)}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldCls}>
          <label className={labelCls}>{t("category")}</label>
          <Input
            name="category"
            required
            list={datalistId}
            placeholder={t("categoryPlaceholder")}
          />
          <datalist id={datalistId}>
            {CATEGORIES[activeKind].map((c) => (
              <option key={c} value={t(`categories.${c}`)} />
            ))}
          </datalist>
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>{t("date")}</label>
          <Input
            type="date"
            name="occurred_on"
            required
            defaultValue={today}
            onClick={openPicker}
          />
        </div>
      </div>

      <div className={fieldCls}>
        <label className={labelCls}>{t("label")}</label>
        <Input name="label" required placeholder={t("labelPlaceholder")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldCls}>
          <label className={labelCls}>{t("amount")}</label>
          <Input
            type="number"
            name="amount"
            required
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>
        {activeKind === "expense" && (
          <div className={fieldCls}>
            <label className={labelCls}>{t("paidBy")}</label>
            <select
              name="paid_by"
              defaultValue=""
              className="rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange"
            >
              <option value="">{t("paidByNone")}</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeKind === "expense" && (
        <div className={fieldCls}>
          <label className={labelCls}>{t("receipt")}</label>
          <input
            type="file"
            name="receipt"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="text-sm text-grey-700 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-navy/90"
          />
          <span className="text-grey-400 text-xs">{t("receiptHint")}</span>
        </div>
      )}

      <div className={fieldCls}>
        <label className={labelCls}>{t("notes")}</label>
        <textarea
          name="notes"
          rows={2}
          placeholder={t("notesPlaceholder")}
          className="rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange"
        />
      </div>

      {state.status === "error" && state.message && (
        <p className="text-sm text-error">{t(state.message)}</p>
      )}

      <SubmitButton label={t("submit")} pending={t("submitting")} />
    </form>
  );
}
