"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvoice, type CreateInvoiceState } from "@/lib/admin/actions";

type Client = { id: string; label: string };

const INITIAL: CreateInvoiceState = { status: "idle", message: "" };

function SubmitButton({ label }: { label: string }) {
  const status = useFormStatus();
  return (
    <Button type="submit" disabled={status.pending}>
      {status.pending ? "…" : label}
    </Button>
  );
}

export function InvoiceForm({ clients }: { clients: Client[] }) {
  const t = useTranslations("Admin.invoices.create");
  const [state, action] = useFormState(createInvoice, INITIAL);
  const [open, setOpen] = React.useState(false);

  // Collapse again once an invoice went through, so the table stays in view.
  React.useEffect(() => {
    if (state.status === "ok") setOpen(false);
  }, [state.status]);

  const labelCls =
    "block text-xs font-medium uppercase tracking-wide text-grey-500";
  const fieldCls = "mt-1 w-full";

  return (
    <div className="mt-8">
      {state.status === "ok" && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-xl bg-success/10 px-4 py-2 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" />
          {t("created", { number: state.invoiceNumber ?? "" })}
        </p>
      )}

      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t("open")}
        </Button>
      ) : (
        <form
          action={action}
          className="flex flex-col gap-4 rounded-2xl border border-grey-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-anton text-xl uppercase text-navy">
              {t("title")}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-grey-500 hover:text-navy"
            >
              {t("cancel")}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="inv-client" className={labelCls}>
                {t("client")}
              </label>
              <select
                id="inv-client"
                name="profileId"
                required
                defaultValue=""
                className="border-grey-200 mt-1 w-full rounded-lg border px-3 py-2 text-sm text-navy"
              >
                <option value="" disabled>
                  {t("clientPlaceholder")}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="inv-desc" className={labelCls}>
                {t("description")}
              </label>
              <Input
                id="inv-desc"
                name="description"
                required
                maxLength={200}
                placeholder={t("descriptionPlaceholder")}
                className={fieldCls}
              />
            </div>

            <div>
              <label htmlFor="inv-amount" className={labelCls}>
                {t("amount")}
              </label>
              <Input
                id="inv-amount"
                name="amount"
                type="number"
                step="0.05"
                min="0.05"
                required
                placeholder="100.00"
                className={fieldCls}
              />
            </div>

            <div>
              <label htmlFor="inv-due" className={labelCls}>
                {t("dueDate")}
              </label>
              <Input
                id="inv-due"
                name="dueDate"
                type="date"
                className={fieldCls}
              />
            </div>

            <div>
              <label htmlFor="inv-method" className={labelCls}>
                {t("method")}
              </label>
              <select
                id="inv-method"
                name="method"
                defaultValue="twint"
                className="border-grey-200 mt-1 w-full rounded-lg border px-3 py-2 text-sm text-navy"
              >
                <option value="twint">{t("methodTwint")}</option>
                <option value="stripe">{t("methodCard")}</option>
              </select>
            </div>

            <label className="flex items-center gap-2 self-end pb-2 text-sm text-grey-700">
              <input
                type="checkbox"
                name="notify"
                value="1"
                defaultChecked
                className="h-4 w-4 rounded border-grey-300 text-orange focus-visible:ring-orange"
              />
              {t("notify")}
            </label>
          </div>

          {state.status === "error" && (
            <p className="text-sm text-error">{t(state.message)}</p>
          )}

          <div className="flex items-center gap-3">
            <SubmitButton label={t("submit")} />
            <span className="text-xs text-grey-500">{t("hint")}</span>
          </div>
        </form>
      )}
    </div>
  );
}
