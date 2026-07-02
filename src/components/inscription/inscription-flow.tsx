"use client";

import * as React from "react";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  PartyPopper,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Turnstile } from "@/components/security/turnstile";
import { submitRegistration } from "@/lib/inscription/actions";
import { createWizardAccount } from "@/lib/auth/actions";
import {
  AUDIENCES,
  CADENCES,
  FORMULAS,
  INSTALLMENTS,
  PAYMENT_METHODS,
  PRICING,
  installmentCents,
  priceFor,
  volumeDiscount,
  type Audience,
  type Cadence,
  type Formula,
  type Order,
  type OrderKeeper,
  type PaymentMethod,
} from "@/lib/inscription/pricing";

type Profile = "private" | "club";
type KeeperLine = OrderKeeper;

const PROFILES: Profile[] = ["private", "club"];
const REF_YEAR = 2026;

function audienceFromYear(birthYear: number): Audience {
  return REF_YEAR - birthYear >= 18 ? "adult" : "youth";
}

type Props = {
  initialAudience?: Audience;
  initialFormula?: Formula;
  isAuthed?: boolean;
};

export function InscriptionFlow({
  initialAudience,
  initialFormula,
  isAuthed = false,
}: Props) {
  const t = useTranslations("Inscription");
  const locale = useLocale();

  const blankKeeper = (): KeeperLine => ({
    firstName: "",
    lastName: "",
    birthYear: "",
    audience: initialAudience ?? "youth",
    formula: initialFormula ?? "season",
  });

  const [step, setStep] = React.useState(0);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [keepers, setKeepers] = React.useState<KeeperLine[]>([blankKeeper()]);
  const [contact, setContact] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    org: "",
    notes: "",
    password: "",
  });
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [invoiceRef, setInvoiceRef] = React.useState<string | null>(null);
  const [method, setMethod] = React.useState<PaymentMethod>("card");
  const [cadence, setCadence] = React.useState<Cadence>("annual");
  const [paidMethod, setPaidMethod] = React.useState<PaymentMethod>("card");

  const isOrg = profile === "club";
  const keeperCount = keepers.length;
  const subtotal = keepers.reduce(
    (sum, k) => sum + priceFor(k.audience, k.formula),
    0,
  );
  const discount = volumeDiscount(keeperCount);
  const total = Math.round(subtotal * (1 - discount));

  // A "séance découverte" (single) is always paid once — no installments. Only
  // season/tour formulas can be split into installments.
  const allowInstallments = keepers.some((k) => k.formula !== "single");
  React.useEffect(() => {
    if (!allowInstallments) setCadence("annual");
  }, [allowInstallments]);

  const STEPS = [
    t("steps.profile"),
    t("steps.formula"),
    t("steps.details"),
    t("steps.summary"),
  ];

  const canNext = (() => {
    if (step === 0) return profile !== null;
    if (step === 1)
      return keepers.every(
        (k) => k.firstName.trim() && k.lastName.trim() && k.birthYear,
      );
    if (step === 2) {
      const contactOk =
        contact.firstName.trim() &&
        contact.lastName.trim() &&
        contact.email.trim() &&
        (isAuthed || contact.password.trim().length >= 8);
      if (isOrg) return Boolean(contactOk && contact.org.trim());
      return Boolean(contactOk);
    }
    return true;
  })();

  function updateKeeper(i: number, patch: Partial<KeeperLine>) {
    setKeepers((prev) =>
      prev.map((k, idx) => (idx === i ? { ...k, ...patch } : k)),
    );
  }

  async function submit() {
    setSubmitting(true);
    setError(null);

    const order: Order = {
      profile: profile ?? "private",
      org: isOrg ? contact.org : undefined,
      notes: isOrg ? contact.notes : undefined,
      keepers,
      contact: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
      },
    };

    // 0. Not signed in yet → create the account from the entered details.
    if (!isAuthed) {
      const token =
        (
          document.querySelector(
            'input[name="cf-turnstile-response"]',
          ) as HTMLInputElement | null
        )?.value ?? "";
      try {
        const acc = await createWizardAccount({
          email: contact.email,
          password: contact.password,
          role: isOrg ? "club" : "parent",
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          locale,
          turnstileToken: token,
        });
        if (acc.status !== "ok") {
          setSubmitting(false);
          setError(
            acc.status === "exists"
              ? "accountExists"
              : acc.status === "captcha"
                ? "captcha"
                : acc.status === "confirm"
                  ? "confirm"
                  : "generic",
          );
          return;
        }
      } catch {
        setSubmitting(false);
        setError("generic");
        return;
      }
    }

    // 1. Persist the plan + installment invoices (requires being signed in).
    let planId: string;
    try {
      const result = await submitRegistration({
        profile: order.profile,
        org: order.org,
        notes: order.notes,
        keepers,
        method,
        cadence,
      });
      if (result.status === "auth") {
        setSubmitting(false);
        setError("generic");
        return;
      }
      if (result.status !== "ok") {
        setSubmitting(false);
        setError("generic");
        return;
      }
      planId = result.planId;
      setInvoiceRef(result.firstInvoiceNumber);
      setPaidMethod(result.method);
    } catch {
      setSubmitting(false);
      setError("generic");
      return;
    }

    // 2a. QR-invoice → no Stripe; the invoices are ready in the member area.
    if (method === "qr_bill") {
      setSubmitting(false);
      setSubmitted(true);
      return;
    }

    // 2b. Stripe checkout (card subscription / card annual / TWINT). If Stripe
    //     isn't configured yet, the plan + invoices are already saved.
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, locale }),
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // Stripe unavailable — plan is saved, fall through to success.
    }

    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-2xl border border-grey-100 bg-white p-10 text-center shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange/10 text-orange">
          <PartyPopper className="h-7 w-7" />
        </span>
        <h2 className="font-anton text-h2 uppercase text-navy">
          {t("success.title")}
        </h2>
        <p className="text-grey-700">
          {paidMethod === "card"
            ? t("success.bodyCard")
            : t("success.bodyManual")}
        </p>
        {invoiceRef && (
          <p className="rounded-lg bg-grey-100 px-4 py-2 text-sm text-grey-700">
            {t("success.invoiceRef")}{" "}
            <span className="font-mono font-medium text-navy">
              {invoiceRef}
            </span>
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/mon-compte/factures">{t("success.viewInvoices")}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">{t("success.backHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-grey-300 px-3 py-2 text-sm text-navy outline-none focus:border-orange";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* The wizard creates the account from the entered details; existing
          members can just sign in. */}
      {!isAuthed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-grey-100 bg-grey-100/40 px-4 py-3 text-sm">
          <span className="text-grey-700">{t("account.alreadyPrompt")}</span>
          <Button asChild size="sm" variant="ghost">
            <Link href="/connexion">{t("auth.signIn")}</Link>
          </Button>
        </div>
      )}

      {/* Stepper */}
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <React.Fragment key={label}>
              <li
                className={cn(
                  "flex items-center gap-2",
                  active && "text-navy",
                  done && "text-orange",
                  !active && !done && "text-grey-500",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold",
                    active && "border-navy bg-navy text-white",
                    done && "border-orange bg-orange text-white",
                    !active && !done && "border-grey-300 text-grey-500",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className="hidden font-medium sm:inline">{label}</span>
              </li>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1",
                    i < step ? "bg-orange" : "bg-grey-300",
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-grey-100 bg-white p-6 shadow-sm sm:p-8">
        {/* Step 1 — Profile */}
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <h2 className="font-anton text-2xl uppercase text-navy">
              {t("step1.title")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {PROFILES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProfile(p)}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors",
                    profile === p
                      ? "border-orange ring-2 ring-orange/20"
                      : "border-grey-200 hover:border-grey-300",
                  )}
                >
                  <span className="font-anton text-lg uppercase text-navy">
                    {t(`profiles.${p}.label`)}
                  </span>
                  <span className="text-sm text-grey-500">
                    {t(`profiles.${p}.desc`)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Keepers, each with audience + formula cards */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="font-anton text-2xl uppercase text-navy">
                {t("step2.privateTitle")}
              </h2>
              <p className="text-sm text-grey-500">{t("step2.subtitle")}</p>
            </div>

            {keepers.map((k, i) => {
              return (
                <div
                  key={i}
                  className="flex flex-col gap-4 rounded-xl border border-grey-100 p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-anton text-base uppercase text-navy">
                      {t("fields.keeper")} {i + 1}
                    </span>
                    {keepers.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setKeepers((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className="text-grey-400 hover:text-error"
                        aria-label={t("step3.removeKeeper")}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      className={inputClass}
                      placeholder={t("fields.firstName")}
                      value={k.firstName}
                      onChange={(e) =>
                        updateKeeper(i, { firstName: e.target.value })
                      }
                    />
                    <input
                      className={inputClass}
                      placeholder={t("fields.lastName")}
                      value={k.lastName}
                      onChange={(e) =>
                        updateKeeper(i, { lastName: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      min={1940}
                      max={REF_YEAR}
                      placeholder={t("fields.birthYear")}
                      className={cn(inputClass, "w-28")}
                      value={k.birthYear}
                      onChange={(e) => {
                        const value = e.target.value;
                        const year = parseInt(value || "0", 10);
                        updateKeeper(i, {
                          birthYear: value,
                          ...(year >= 1900
                            ? { audience: audienceFromYear(year) }
                            : {}),
                        });
                      }}
                    />
                  </div>

                  {/* Audience */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-grey-500">
                      {t("step2.audienceLabel")}
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {AUDIENCES.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => updateKeeper(i, { audience: a })}
                          className={cn(
                            "rounded-lg border px-4 py-2 text-left text-sm font-medium uppercase transition-colors",
                            k.audience === a
                              ? "border-orange text-navy ring-1 ring-orange/30"
                              : "border-grey-200 text-grey-500 hover:border-grey-300",
                          )}
                        >
                          {t(`audiences.${a}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Formula */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-grey-500">
                      {t("step2.formulaLabel")}
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {FORMULAS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => updateKeeper(i, { formula: f })}
                          className={cn(
                            "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                            k.formula === f
                              ? "border-orange ring-2 ring-orange/20"
                              : "border-grey-200 hover:border-grey-300",
                          )}
                        >
                          <span className="font-anton text-sm uppercase text-navy">
                            {t(`formulas.${f}.label`)}
                          </span>
                          <span className="text-base font-medium text-navy">
                            {PRICING[k.audience][f]} CHF
                            <span className="text-xs font-normal text-grey-500">
                              {" "}
                              / {t("perSession")}
                            </span>
                          </span>
                          <span className="text-xs text-grey-500">
                            {priceFor(k.audience, f)} CHF{" "}
                            {t(`formulas.${f}.totalHint`)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {keepers.length < 12 && (
              <button
                type="button"
                onClick={() => setKeepers((prev) => [...prev, blankKeeper()])}
                className="inline-flex items-center gap-2 self-start text-sm font-medium text-orange hover:text-orange-600"
              >
                <Plus className="h-4 w-4" /> {t("step3.addKeeper")}
              </button>
            )}
          </div>
        )}

        {/* Step 3 — Org + contact */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <h2 className="font-anton text-2xl uppercase text-navy">
              {isOrg ? t("step3.orgTitle") : t("step3.contactTitle")}
            </h2>

            {isOrg && (
              <div className="flex flex-col gap-4 border-b border-grey-100 pb-5">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-navy">
                    {t("fields.org")}
                  </label>
                  <input
                    className={inputClass}
                    value={contact.org}
                    onChange={(e) =>
                      setContact((c) => ({ ...c, org: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-navy">
                    {t("fields.notes")}{" "}
                    <span className="font-normal text-grey-500">
                      ({t("fields.optional")})
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={contact.notes}
                    onChange={(e) =>
                      setContact((c) => ({ ...c, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {isOrg && (
                <span className="text-sm font-medium text-navy">
                  {t("step3.contactPerson")}
                </span>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={inputClass}
                  placeholder={t("fields.firstName")}
                  value={contact.firstName}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, firstName: e.target.value }))
                  }
                />
                <input
                  className={inputClass}
                  placeholder={t("fields.lastName")}
                  value={contact.lastName}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, lastName: e.target.value }))
                  }
                />
                <input
                  type="email"
                  className={inputClass}
                  placeholder={t("fields.email")}
                  value={contact.email}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, email: e.target.value }))
                  }
                />
                <input
                  type="tel"
                  className={inputClass}
                  placeholder={t("fields.phone")}
                  value={contact.phone}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, phone: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Account creation straight from the wizard */}
            {!isAuthed && (
              <div className="flex flex-col gap-3 border-t border-grey-100 pt-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-navy">
                    {t("account.createTitle")}
                  </span>
                  <span className="text-xs text-grey-500">
                    {t("account.createSubtitle")}
                  </span>
                </div>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder={t("account.passwordPlaceholder")}
                  value={contact.password}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, password: e.target.value }))
                  }
                />
                <Turnstile />
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Summary */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <h2 className="font-anton text-2xl uppercase text-navy">
              {t("step4.title")}
            </h2>
            <ul className="flex flex-col divide-y divide-grey-100 text-sm">
              {keepers.map((k, i) => (
                <li key={i} className="flex justify-between gap-3 py-2">
                  <span className="text-grey-700">
                    {k.firstName} {k.lastName} ·{" "}
                    {t(`formulas.${k.formula}.label`)}
                  </span>
                  <span className="font-medium text-navy">
                    {priceFor(k.audience, k.formula)} CHF
                  </span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1 border-t border-grey-100 pt-3 text-sm">
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-grey-500">{t("recap.discount")}</dt>
                  <dd className="font-medium text-orange">
                    −{Math.round(discount * 100)}%
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-1">
                <dt className="font-medium text-navy">{t("recap.total")}</dt>
                <dd className="font-anton text-2xl text-navy">{total} CHF</dd>
              </div>
            </dl>
            <p className="rounded-xl bg-grey-100 p-4 text-xs text-grey-700">
              {t("recap.note")}
            </p>

            {/* Payment method + schedule */}
            <div className="flex flex-col gap-4 border-t border-grey-100 pt-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-grey-500">
                  {t("payment.methodLabel")}
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                        method === m
                          ? "border-orange ring-2 ring-orange/20"
                          : "border-grey-200 hover:border-grey-300",
                      )}
                    >
                      <span className="font-anton text-sm uppercase text-navy">
                        {t(`payment.methods.${m}.label`)}
                      </span>
                      <span className="text-xs text-grey-500">
                        {t(`payment.methods.${m}.desc`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {allowInstallments ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-grey-500">
                    {t("payment.cadenceLabel")}
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CADENCES.map((c) => {
                      const cents = installmentCents(total, c);
                      const amount = (cents / 100).toFixed(
                        cents % 100 === 0 ? 0 : 2,
                      );
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCadence(c)}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg border px-4 py-2 text-left transition-colors",
                            cadence === c
                              ? "border-orange ring-1 ring-orange/30"
                              : "border-grey-200 hover:border-grey-300",
                          )}
                        >
                          <span className="text-sm font-medium text-navy">
                            {t(`payment.cadences.${c}`)}
                          </span>
                          <span className="text-xs text-grey-500">
                            {t("payment.breakdown", {
                              count: INSTALLMENTS[c],
                              amount,
                            })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="border-grey-200 flex items-center justify-between rounded-lg border px-4 py-2">
                  <span className="text-sm font-medium text-navy">
                    {t("payment.oneTime")}
                  </span>
                  <span className="text-sm text-grey-500">{total} CHF</span>
                </div>
              )}

              <p className="rounded-xl bg-navy/5 p-3 text-xs text-grey-700">
                {!allowInstallments
                  ? t("payment.oneTimeHint")
                  : method === "card"
                    ? t("payment.cardRecurringHint")
                    : method === "twint"
                      ? t("payment.twintHint")
                      : t("payment.qrHint")}
              </p>
            </div>

            {error === "accountExists" && (
              <p className="text-sm text-error">
                {t("errors.accountExists")}{" "}
                <Link
                  href="/connexion"
                  className="font-medium text-orange underline"
                >
                  {t("auth.signIn")}
                </Link>
              </p>
            )}
            {error === "captcha" && (
              <p className="text-sm text-error">{t("errors.captcha")}</p>
            )}
            {error === "confirm" && (
              <p className="text-sm text-error">{t("errors.confirm")}</p>
            )}
            {error === "generic" && (
              <p className="text-sm text-error">{t("errors.generic")}</p>
            )}
          </div>
        )}

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> {t("nav.back")}
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
            >
              {t("nav.next")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={submitting}>
              {t("nav.confirm")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
