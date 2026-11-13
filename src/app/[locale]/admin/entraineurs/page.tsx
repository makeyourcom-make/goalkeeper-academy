import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, X, Eye, UserPlus, UserMinus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setCoachPayment } from "@/lib/admin/coach-payment-actions";
import {
  promoteToCoach,
  demoteCoach,
  setCoachDetails,
} from "@/lib/admin/coach-admin-actions";
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
type PaymentRow = {
  coach_id: string;
  period: string;
  amount: number;
  status: string;
};
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
      // Toutes les séances effectuées, non privées : la base de ce qui est dû
      // aux coachs, tous mois confondus (les privées ne sont pas rémunérées).
      supabase
        .from("sessions")
        .select("coach_id, starts_at")
        .eq("status", "completed")
        .eq("is_private", false)
        .returns<{ coach_id: string | null; starts_at: string }[]>(),
      // Tous les relevés de paiement, toutes périodes.
      supabase
        .from("coach_payments")
        .select("coach_id, period, amount, status")
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
  const payments = paymentsRes.data ?? [];
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

  // Décompte des séances par (coach, mois). Le mois vient de starts_at (AAAA-MM).
  const cell = new Map<string, number>();
  const monthsSet = new Set<string>();
  for (const s of sessionsRes.data ?? []) {
    if (!s.coach_id) continue;
    const mo = s.starts_at.slice(0, 7);
    monthsSet.add(mo);
    const k = `${s.coach_id}|${mo}`;
    cell.set(k, (cell.get(k) ?? 0) + 1);
  }
  // Statut de paiement par (coach, mois), et total déjà versé par coach.
  const payStatus = new Map<string, string>();
  const paidByCoach = new Map<string, number>();
  for (const p of payments) {
    monthsSet.add(p.period);
    payStatus.set(`${p.coach_id}|${p.period}`, p.status);
    if (p.status === "paid")
      paidByCoach.set(
        p.coach_id,
        (paidByCoach.get(p.coach_id) ?? 0) + Number(p.amount),
      );
  }
  const months = [...monthsSet].filter(Boolean).sort().reverse();

  // Totaux par coach : séances, dû, déjà payé, reste.
  const totals = coaches.map((c) => {
    let sessions = 0;
    for (const mo of monthsSet) sessions += cell.get(`${c.id}|${mo}`) ?? 0;
    const owed = sessions * c.rate_per_session;
    const paid = paidByCoach.get(c.id) ?? 0;
    return { coach: c, sessions, owed, paid, remaining: owed - paid };
  });
  const grand = totals.reduce(
    (a, t) => ({
      sessions: a.sessions + t.sessions,
      owed: a.owed + t.owed,
      paid: a.paid + t.paid,
      remaining: a.remaining + t.remaining,
    }),
    { sessions: 0, owed: 0, paid: 0, remaining: 0 },
  );

  const chf = new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
    style: "currency",
    currency: "CHF",
  });
  const monthName = (ym: string) => {
    const [y, m] = ym.split("-");
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(new Date(Number(y), Number(m) - 1, 1));
  };

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
                      <form
                        id={`edit-${c.id}`}
                        action={setCoachDetails}
                        className="flex flex-col gap-1"
                      >
                        <input type="hidden" name="coachId" value={c.id} />
                        <input
                          type="hidden"
                          name="profileId"
                          value={c.profile_id}
                        />
                        <div className="flex gap-1">
                          <input
                            name="firstName"
                            defaultValue={c.profiles?.first_name ?? ""}
                            placeholder={t("edit.firstName")}
                            className="w-24 rounded-lg border border-grey-300 bg-white px-2 py-1 text-sm text-navy outline-none focus:border-orange"
                          />
                          <input
                            name="lastName"
                            defaultValue={c.profiles?.last_name ?? ""}
                            placeholder={t("edit.lastName")}
                            className="w-24 rounded-lg border border-grey-300 bg-white px-2 py-1 text-sm text-navy outline-none focus:border-orange"
                          />
                        </div>
                        <span className="text-xs text-grey-500">
                          {c.profiles?.email}
                        </span>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        form={`edit-${c.id}`}
                        name="speciality"
                        defaultValue={c.speciality ?? ""}
                        placeholder={t("edit.speciality")}
                        className="w-40 rounded-lg border border-grey-300 bg-white px-2 py-1 text-sm text-navy outline-none focus:border-orange"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          form={`edit-${c.id}`}
                          name="rate"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={c.rate_per_session}
                          className="w-20 rounded-lg border border-grey-300 bg-white px-2 py-1 text-sm text-navy outline-none focus:border-orange"
                        />
                        <span className="text-xs text-grey-500">CHF</span>
                      </div>
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
                        <button
                          type="submit"
                          form={`edit-${c.id}`}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-orange px-3 py-1 text-xs font-medium text-white transition hover:bg-orange/90"
                        >
                          <Check className="h-3.5 w-3.5" /> {t("edit.save")}
                        </button>
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

      {/* Bilan par coach : totaux tous mois confondus (dû / payé / reste). */}
      <div className="mt-10 flex flex-col gap-3">
        <h2 className="font-anton text-xl uppercase text-navy">
          {t("payments.overviewTitle")}
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
                    {t("payments.owed")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("payments.paidAmount")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("payments.remaining")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-100">
                {totals.map((row) => (
                  <tr key={row.coach.id} className="hover:bg-grey-100/40">
                    <td className="px-4 py-3 font-medium text-navy">
                      {name(row.coach)}
                    </td>
                    <td className="px-4 py-3 text-grey-700">{row.sessions}</td>
                    <td className="px-4 py-3 text-grey-700">
                      {chf.format(row.owed)}
                    </td>
                    <td className="px-4 py-3 text-success">
                      {chf.format(row.paid)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-navy">
                      {chf.format(row.remaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {coaches.length > 0 && (
                <tfoot className="border-t-2 border-grey-100 bg-grey-100/30">
                  <tr>
                    <td className="px-4 py-3 font-anton uppercase text-navy">
                      {t("payments.totalLabel")}
                    </td>
                    <td className="px-4 py-3 font-medium text-navy">
                      {grand.sessions}
                    </td>
                    <td className="px-4 py-3 font-medium text-navy">
                      {chf.format(grand.owed)}
                    </td>
                    <td className="px-4 py-3 font-medium text-success">
                      {chf.format(grand.paid)}
                    </td>
                    <td className="px-4 py-3 font-anton text-orange">
                      {chf.format(grand.remaining)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Détail par mois : un bloc par mois, décompté sur les séances réelles,
          avec le bouton pour marquer la période payée. */}
      <div className="mt-10 flex flex-col gap-6">
        <h2 className="font-anton text-xl uppercase text-navy">
          {t("payments.detailTitle")}
        </h2>
        {months.length === 0 ? (
          <p className="text-sm text-grey-500">{t("empty")}</p>
        ) : (
          months.map((mo) => {
            const rows = coaches
              .map((c) => ({
                coach: c,
                count: cell.get(`${c.id}|${mo}`) ?? 0,
                status: payStatus.get(`${c.id}|${mo}`),
              }))
              .filter((r) => r.count > 0 || r.status);
            if (rows.length === 0) return null;
            return (
              <div key={mo} className="flex flex-col gap-2">
                <h3 className="font-anton text-base uppercase text-navy">
                  <span className="capitalize text-orange">
                    {monthName(mo)}
                  </span>
                </h3>
                <div className="overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">
                            {t("table.name")}
                          </th>
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
                        {rows.map(({ coach: c, count, status }) => {
                          const amount = count * c.rate_per_session;
                          const paid = status === "paid";
                          return (
                            <tr key={c.id} className="hover:bg-grey-100/40">
                              <td className="px-4 py-3 font-medium text-navy">
                                {name(c)}
                              </td>
                              <td className="px-4 py-3 text-grey-700">
                                {count}
                              </td>
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
                                  {paid
                                    ? t("payments.paid")
                                    : t("payments.pending")}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <form action={setCoachPayment}>
                                  <input
                                    type="hidden"
                                    name="coachId"
                                    value={c.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="period"
                                    value={mo}
                                  />
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
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
