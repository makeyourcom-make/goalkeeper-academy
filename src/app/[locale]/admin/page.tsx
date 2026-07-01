import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Users,
  Baby,
  Receipt,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.dashboard" });
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

async function fetchCounts() {
  const supabase = await createSupabaseServerClient();
  const [parents, children, invoices, pendingInvoices] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("role", ["parent", "club"]),
    supabase.from("children").select("id", { count: "exact", head: true }),
    supabase.from("invoices").select("id", { count: "exact", head: true }),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);
  return {
    parents: parents.count ?? 0,
    children: children.count ?? 0,
    invoices: invoices.count ?? 0,
    pendingInvoices: pendingInvoices.count ?? 0,
  };
}

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.dashboard");
  const counts = await fetchCounts();

  const STATS: { key: keyof typeof counts; Icon: LucideIcon }[] = [
    { key: "parents", Icon: Users },
    { key: "children", Icon: Baby },
    { key: "invoices", Icon: Receipt },
    { key: "pendingInvoices", Icon: CalendarDays },
  ];

  return (
    <div className="container py-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Badge variant="orange" className="self-start">
          {t("eyebrow")}
        </Badge>
        <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-grey-700">{t("subtitle")}</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map(({ key, Icon }) => (
          <article
            key={key}
            className="flex flex-col gap-2 rounded-2xl border border-grey-100 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-grey-500">
                {t(`stats.${key}`)}
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange/10 text-orange">
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="font-anton text-h1 text-navy">{counts[key]}</p>
          </article>
        ))}
      </div>

      <section className="mt-12 rounded-2xl border border-grey-100 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-anton text-2xl uppercase text-navy">
          {t("welcome.title")}
        </h2>
        <p className="mt-3 text-sm text-grey-700">{t("welcome.body")}</p>
      </section>
    </div>
  );
}
