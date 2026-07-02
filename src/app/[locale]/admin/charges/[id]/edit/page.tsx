import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { updateTransaction } from "@/lib/admin/finance-actions";
import { getCoachOptions } from "@/lib/admin/coach-options";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string }>;
};

type Transaction = {
  id: string;
  kind: "income" | "expense";
  category: string;
  label: string;
  amount: number;
  occurred_on: string;
  notes: string | null;
  paid_by: string | null;
  receipt_url: string | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.expenses" });
  return { title: t("editTitle"), robots: { index: false, follow: false } };
}

export default async function EditExpensePage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.expenses");
  const tf = await getTranslations("Admin.finance");

  const supabase = await createSupabaseServerClient();
  const { data: tx } = await supabase
    .from("transactions")
    .select(
      "id, kind, category, label, amount, occurred_on, notes, paid_by, receipt_url",
    )
    .eq("id", id)
    .maybeSingle<Transaction>();

  if (!tx) redirect(`/${locale}/admin/charges`);

  const coaches = await getCoachOptions(supabase);

  const receiptUrl = tx.receipt_url
    ? ((
        await supabase.storage
          .from("receipts")
          .createSignedUrl(tx.receipt_url, 600)
      ).data?.signedUrl ?? null)
    : null;

  const labelCls = "text-xs font-medium text-grey-500";
  const fieldCls = "flex flex-col gap-1";

  return (
    <div className="container py-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Badge variant="orange" className="self-start">
          {t("eyebrow")}
        </Badge>
        <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
          {t("editTitle")}
        </h1>
      </div>

      <form
        action={updateTransaction}
        className="mt-8 flex max-w-2xl flex-col gap-5 rounded-2xl border border-grey-100 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="id" value={tx.id} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="kind" value={tx.kind} />

        {error && <p className="text-sm text-error">{t("editError")}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={fieldCls}>
            <label className={labelCls}>{tf("category")}</label>
            <Input name="category" required defaultValue={tx.category} />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>{tf("date")}</label>
            <Input
              type="date"
              name="occurred_on"
              required
              defaultValue={tx.occurred_on}
            />
          </div>
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>{tf("label")}</label>
          <Input name="label" required defaultValue={tx.label} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={fieldCls}>
            <label className={labelCls}>{tf("amount")}</label>
            <Input
              type="number"
              name="amount"
              required
              min="0"
              step="0.01"
              defaultValue={tx.amount}
            />
          </div>
          {tx.kind === "expense" && (
            <div className={fieldCls}>
              <label className={labelCls}>{tf("paidBy")}</label>
              <select
                name="paid_by"
                defaultValue={tx.paid_by ?? ""}
                className="rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange"
              >
                <option value="">{tf("paidByNone")}</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {tx.paid_by && !coaches.some((c) => c.name === tx.paid_by) && (
                  <option value={tx.paid_by}>{tx.paid_by}</option>
                )}
              </select>
            </div>
          )}
        </div>

        {tx.kind === "expense" && (
          <div className={fieldCls}>
            <label className={labelCls}>{tf("receipt")}</label>
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-orange hover:underline"
              >
                <Paperclip className="h-3 w-3" /> {t("currentReceipt")}
              </a>
            )}
            <input
              type="file"
              name="receipt"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="text-sm text-grey-700 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-navy/90"
            />
            <span className="text-grey-400 text-xs">{t("replaceReceipt")}</span>
          </div>
        )}

        <div className={fieldCls}>
          <label className={labelCls}>{tf("notes")}</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={tx.notes ?? ""}
            placeholder={tf("notesPlaceholder")}
            className="rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit">{t("save")}</Button>
          <Button asChild variant="ghost">
            <Link href="/admin/charges">{t("cancel")}</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
