import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, X, Eye, UserPlus, UserMinus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setCoachPayment } from "@/lib/admin/coach-payment-actions";
import { promoteToCoach, demoteCoach } from "@/lib/admin/coach-admin-actions";
import { viewAsUser } from "@/lib/admin/impersonation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Props = {
  params: Promise<{ locale: string }>;
};

type CoachRow = {
  id: string;
  profile_id: string;
  rate_per_session: number;
  speciality: string | null;
  active: boolean;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    iban: string | null;
  } | null;
};
type PaymentRow = { coach_id: string; status: string };
type EligibleRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.coaches" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminCoachesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.coaches");

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const periodStart = `${period}-01`;
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const periodEnd = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;

  const supabase = await createSupabaseServerClient();
  const [coachesRes, sessionsRes, paymentsRes, eligibleRes] = await Promise.all(
    [
      supabase
        .from("coaches")
        .select(
          "id, profile_id, rate_per_session, speciality, active, profiles(first_name, last_name, email, iban)",
        )
        .order("created_at", { ascending: true })
        .returns<CoachRow[]>(),
      supabase
        .from("sessions")
        .select("id, coach_id")
        .gte("starts_at", periodStart)
        .lt("starts_at", periodEnd)
        .neq("status", "cancelled")
        .returns<{ id: string; coach_id: string | null }[]>(),
      supabase
        .from("coach_payments")
        .select("coach_id, status")
        .eq("period", period)
        .returns<PaymentRow[]>(),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("role", ["parent", "club"])
        .order("created_at", { ascending: true })
        .returns<EligibleRow[]>(),
    ],
  );

  const coaches = coachesRes.data ?? [];
  const eligible = eligibleRes.data ?? [];
  const eligibleName = (p: EligibleRow) =>
    `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email;

  // Accounts that asked to become a coach at signup (auth metadata) — surface
  // them first so the admin knows who to validate.
  const svc = createSupabaseAdminClient();
  const { data: authList } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const requestedCoach = new Set(
    (authList?.users ?? [])
      .filter(
        (u) =>
          (u.user_metadata as { requested_role?: string })?.requested_role ===
          "coach",
      )
      .map((u) => u.id),
  );
  eligible.sort(
    (a, b) =>
      (requestedCoach.has(a.id) ? 0 : 1) - (requestedCoach.has(b.id) ? 0 : 1),
  );
  const sessionCount = new Map<string, number>();
  for (const s of sessionsRes.data ?? []) {
    if (s.coach_id)
      sessionCount.set(s.coach_id, (sessionCount.get(s.coach_id) ?? 0) + 1);
  }
  const paidStatus = new Map<string, string>();
  for (const p of paymentsRes.data ?? []) paidStatus.set(p.coach_id, p.status);

  const chf = new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
    style: "currency",
    currency: "CHF",
  });
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(now);

  const name = (c: CoachRow) =>
    `${c.profiles?.first_name ?? ""} ${c.profiles?.last_name ?? ""}`.trim() ||
    "—";

  return (
    <div className="container py-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Badge variant="orange" className="self-start">
          {t("eyebrow")}
        </Badge>
        <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-grey-700">
          {t("count", { count: coaches.length })}
        </p>
      </div>

      {/* Promote an existing (parent/club) account to coach */}
      <div className="mt-6 rounded-2xl border border-grey-100 bg-white p-5 shadow-sm">
        <h2 className="font-anton text-lg uppercase text-navy">
          {t("promote.title")}
        </h2>
        <p className="mt-1 text-sm text-grey-500">{t("promote.subtitle")}</p>
        {eligible.length === 0 ? (
          <p className="mt-3 text-sm text-grey-500">{t("promote.empty")}</p>
        ) : (
          <form
            action={promoteToCoach}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-grey-500">
                {t("promote.select")}
              </label>
              <select
                name="profileId"
                required
                defaultValue=""
                className="rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange"
              >
                <option value="" disabled>
                  {t("promote.placeholder")}
                </option>
                {eligible.map((p) => (
                  <option key={p.id} value={p.id}>
                    {eligibleName(p)} · {p.email}
                    {requestedCoach.has(p.id)
                      ? ` · ${t("promote.requested")}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">
              <UserPlus className="mr-1 h-4 w-4" /> {t("promote.button")}
            </Button>
          </form>
        )}
      </div>

      {/* Coaches */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("table.name")}</th>
                <th className="px-4 py-3 font-medium">
                  {t("table.speciality")}
                </th>
                <th className="px-4 py-3 font-medium">{t("table.rate")}</th>
                <th className="px-4 py-3 font-medium">{t("table.iban")}</th>
                <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                <th className="px-4 py-3 font-medium">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {coaches.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-grey-500"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                coaches.map((c) => (
                  <tr key={c.id} className="hover:bg-grey-100/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{name(c)}</div>
                      <div className="text-xs text-grey-500">
                        {c.profiles?.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-grey-700">
                      {c.speciality || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-navy">
                      {chf.format(c.rate_per_session)}
                    </td>
                    <td className="px-4 py-3">
                      {c.profiles?.iban ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                          <Check className="h-4 w-4" /> {t("ibanOk")}
                        </span>
                      ) : (
                        <span className="text-grey-400 inline-flex items-center gap-1 text-xs font-medium">
                          <X className="h-4 w-4" /> {t("ibanMissing")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          c.active
                            ? "inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                            : "inline-flex rounded-full bg-grey-100 px-2 py-0.5 text-xs font-medium text-grey-500"
                        }
                      >
                        {c.active ? t("active") : t("inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={viewAsUser}>
                          <input
                            type="hidden"
                            name="userId"
                            value={c.profile_id}
                          />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-grey-300 px-3 py-1 text-xs font-medium text-navy transition hover:border-orange hover:text-orange"
                          >
                            <Eye className="h-3.5 w-3.5" /> {t("viewAs")}
                          </button>
                        </form>
                        <form action={demoteCoach}>
                          <input
                            type="hidden"
                            name="profileId"
                            value={c.profile_id}
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-grey-300 px-3 py-1 text-xs font-medium text-grey-500 transition hover:border-error hover:text-error"
                          >
                            <UserMinus className="h-3.5 w-3.5" /> {t("demote")}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments — current month */}
      <div className="mt-10 flex flex-col gap-3">
        <h2 className="font-anton text-xl uppercase text-navy">
          {t("payments.title")}{" "}
          <span className="text-orange">{monthLabel}</span>
        </h2>
        <div className="overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("table.name")}</th>
                  <th className="px-4 py-3 font-medium">
                    {t("payments.sessions")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("payments.rate")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("payments.amount")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("payments.statusCol")}
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-100">
                {coaches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-grey-500"
                    >
                      {t("empty")}
                    </td>
                  </tr>
                ) : (
                  coaches.map((c) => {
                    const count = sessionCount.get(c.id) ?? 0;
                    const amount = count * c.rate_per_session;
                    const paid = paidStatus.get(c.id) === "paid";
                    return (
                      <tr key={c.id} className="hover:bg-grey-100/40">
                        <td className="px-4 py-3 font-medium text-navy">
                          {name(c)}
                        </td>
                        <td className="px-4 py-3 text-grey-700">{count}</td>
                        <td className="px-4 py-3 text-grey-700">
                          {chf.format(c.rate_per_session)}
                        </td>
                        <td className="px-4 py-3 font-medium text-navy">
                          {chf.format(amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              paid
                                ? "inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                                : "inline-flex rounded-full bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange"
                            }
                          >
                            {paid ? t("payments.paid") : t("payments.pending")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <form action={setCoachPayment}>
                            <input type="hidden" name="coachId" value={c.id} />
                            <input type="hidden" name="period" value={period} />
                            <input
                              type="hidden"
                              name="sessionsCount"
                              value={count}
                            />
                            <input
                              type="hidden"
                              name="rate"
                              value={c.rate_per_session}
                            />
                            <input
                              type="hidden"
                              name="paid"
                              value={paid ? "false" : "true"}
                            />
                            <Button
                              type="submit"
                              variant={paid ? "ghost" : "primary"}
                              size="sm"
                            >
                              {paid
                                ? t("payments.markUnpaid")
                                : t("payments.markPaid")}
                            </Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
