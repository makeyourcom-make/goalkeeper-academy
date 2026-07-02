"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import {
  Check,
  CreditCard,
  Smartphone,
  FileText,
  Lock,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { startCampCheckout } from "@/lib/reservation/checkout";
import { cn } from "@/lib/utils";

type ChildOption = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
};

type CampSummary = {
  slug: string;
  title: string;
  dateRange: string;
  location: string;
  price: number;
  formattedPrice: string;
  image: string;
};

type Props = {
  camp: CampSummary;
  childrenList: ChildOption[];
  parentEmail: string | null;
  isAuthenticated: boolean;
};

type Step = 0 | 1 | 2;
type PaymentMethod = "card" | "twint" | "qr_bill";

function PayButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        <>
          <Lock className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}

export function ReservationFlow({
  camp,
  childrenList,
  parentEmail,
  isAuthenticated,
}: Props) {
  const t = useTranslations("Reservation");
  const locale = useLocale();
  const [step, setStep] = React.useState<Step>(0);
  const [selectedChildId, setSelectedChildId] = React.useState<string>(
    childrenList[0]?.id ?? "",
  );
  const [guestName, setGuestName] = React.useState("");
  const [email, setEmail] = React.useState(parentEmail ?? "");
  const [paymentMethod, setPaymentMethod] =
    React.useState<PaymentMethod>("card");

  const selectedChild = childrenList.find((c) => c.id === selectedChildId);
  const childName =
    isAuthenticated && selectedChild
      ? `${selectedChild.first_name} ${selectedChild.last_name}`
      : guestName;

  const canGoToStep1 =
    childName.trim().length > 0 && /\S+@\S+\.\S+/.test(email);

  const STEPS = [
    { key: "child", label: t("steps.child") },
    { key: "review", label: t("steps.review") },
    { key: "payment", label: t("steps.payment") },
  ] as const;

  const backHref = `/stages/${camp.slug}/reservation`;

  // A camp reservation records a real registration + invoice, so the parent
  // must be signed in and choose one of their registered goalkeepers.
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-grey-100 bg-white p-8 text-center shadow-sm">
        <h2 className="font-anton text-2xl uppercase text-navy">
          {t("gate.loginTitle")}
        </h2>
        <p className="mt-3 text-sm text-grey-700">{t("gate.loginBody")}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href={{ pathname: "/connexion", query: { next: backHref } }}>
              {t("gate.loginCta")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/inscription">{t("gate.signupCta")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (childrenList.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-grey-100 bg-white p-8 text-center shadow-sm">
        <h2 className="font-anton text-2xl uppercase text-navy">
          {t("gate.childTitle")}
        </h2>
        <p className="mt-3 text-sm text-grey-700">{t("gate.childBody")}</p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/mon-compte/enfants/nouveau">{t("gate.childCta")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* Main column */}
      <div className="flex flex-col gap-6">
        {/* Stepper */}
        <ol className="flex items-center gap-2 text-sm">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <React.Fragment key={s.key}>
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
                  <span className="hidden font-medium sm:inline">
                    {s.label}
                  </span>
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

        {/* Step content */}
        <div className="rounded-2xl border border-grey-100 bg-white p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <h2 className="font-anton text-2xl uppercase text-navy">
                {t("step1.title")}
              </h2>
              <p className="text-sm text-grey-700">{t("step1.subtitle")}</p>

              {isAuthenticated && childrenList.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-navy">
                    {t("step1.selectChild")}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {childrenList.map((child) => {
                      const checked = selectedChildId === child.id;
                      return (
                        <li key={child.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition",
                              checked
                                ? "border-orange bg-orange/5"
                                : "border-grey-100 hover:border-grey-300",
                            )}
                          >
                            <input
                              type="radio"
                              name="child"
                              value={child.id}
                              checked={checked}
                              onChange={() => setSelectedChildId(child.id)}
                              className="h-4 w-4 accent-orange"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-navy">
                                {child.first_name} {child.last_name}
                              </p>
                              <p className="text-xs text-grey-500">
                                {new Date(child.birth_date).toLocaleDateString(
                                  locale,
                                  {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                            </div>
                            {checked && (
                              <Check className="h-5 w-5 text-orange" />
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="guestName"
                    className="text-sm font-medium text-navy"
                  >
                    {t("step1.guestNameLabel")}
                  </label>
                  <Input
                    id="guestName"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={t("step1.guestNamePlaceholder")}
                  />
                  {!isAuthenticated && (
                    <p className="mt-1 text-xs text-grey-500">
                      {t("step1.notLoggedIn")}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-navy"
                >
                  {t("step1.emailLabel")}
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.ch"
                />
              </div>

              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={!canGoToStep1}
                >
                  {t("next")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <h2 className="font-anton text-2xl uppercase text-navy">
                {t("step2.title")}
              </h2>
              <p className="text-sm text-grey-700">{t("step2.subtitle")}</p>

              <dl className="flex flex-col divide-y divide-grey-100 rounded-xl border border-grey-100">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-sm text-grey-500">{t("step2.camp")}</dt>
                  <dd className="text-right font-medium text-navy">
                    {camp.title}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-sm text-grey-500">{t("step2.dates")}</dt>
                  <dd className="text-right font-medium text-navy">
                    {camp.dateRange}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-sm text-grey-500">
                    {t("step2.location")}
                  </dt>
                  <dd className="text-right font-medium text-navy">
                    {camp.location}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-sm text-grey-500">
                    {t("step2.participant")}
                  </dt>
                  <dd className="text-right font-medium text-navy">
                    {childName}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-sm text-grey-500">{t("step2.email")}</dt>
                  <dd className="text-right font-medium text-navy">{email}</dd>
                </div>
              </dl>

              <div className="rounded-xl bg-grey-100 p-4 text-sm text-grey-700">
                {t("step2.terms")}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(0)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("back")}
                </Button>
                <Button type="button" onClick={() => setStep(2)}>
                  {t("step2.continue")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form action={startCampCheckout} className="flex flex-col gap-5">
              <input type="hidden" name="slug" value={camp.slug} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="childId" value={selectedChildId} />
              <input type="hidden" name="paymentMethod" value={paymentMethod} />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-anton text-2xl uppercase text-navy">
                    {t("step3.title")}
                  </h2>
                  <p className="text-sm text-grey-700">{t("step3.subtitle")}</p>
                </div>
                <Badge variant="muted" className="mt-1">
                  <Lock className="mr-1 h-3 w-3" />
                  {t("step3.secureBadge")}
                </Badge>
              </div>

              {/* Payment method tabs */}
              <div role="tablist" className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "card", Icon: CreditCard },
                    { key: "twint", Icon: Smartphone },
                    { key: "qr_bill", Icon: FileText },
                  ] as const
                ).map(({ key, Icon }) => {
                  const active = paymentMethod === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setPaymentMethod(key)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition",
                        active
                          ? "border-navy bg-navy text-white"
                          : "border-grey-100 bg-white text-navy hover:border-grey-300",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {t(`step3.methods.${key}`)}
                    </button>
                  );
                })}
              </div>

              {/* Method body */}
              {paymentMethod === "card" && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-grey-100 bg-white p-6 text-center">
                  <CreditCard className="h-8 w-8 text-orange" />
                  <p className="font-medium text-navy">
                    {t("step3.card.title")}
                  </p>
                  <p className="text-sm text-grey-700">
                    {t("step3.card.body")}
                  </p>
                </div>
              )}

              {paymentMethod === "twint" && (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-grey-100 bg-white p-8 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-xl bg-navy text-white">
                    <Smartphone className="h-8 w-8" />
                  </div>
                  <p className="font-medium text-navy">
                    {t("step3.twint.title")}
                  </p>
                  <p className="text-sm text-grey-700">
                    {t("step3.twint.body")}
                  </p>
                </div>
              )}

              {paymentMethod === "qr_bill" && (
                <div className="flex flex-col gap-3 rounded-xl border border-grey-100 bg-white p-6">
                  <FileText className="h-8 w-8 text-orange" />
                  <p className="font-medium text-navy">{t("step3.qr.title")}</p>
                  <p className="text-sm text-grey-700">{t("step3.qr.body")}</p>
                  <ul className="mt-2 flex flex-col gap-1 text-xs text-grey-500">
                    <li>{t("step3.qr.iban")} CH00 0000 0000 0000 0000 0</li>
                    <li>{t("step3.qr.beneficiary")} The Last Line SA</li>
                    <li>
                      {t("step3.qr.due")} 30 {t("step3.qr.days")}
                    </li>
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-navy px-5 py-4 text-white">
                <span className="text-sm uppercase tracking-wide opacity-80">
                  {t("step3.total")}
                </span>
                <span className="font-anton text-2xl">
                  {camp.formattedPrice}
                </span>
              </div>

              <PayButton
                label={t("step3.pay", { amount: camp.formattedPrice })}
                pendingLabel={t("step3.processing")}
              />

              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-1 inline-flex items-center gap-1 self-start text-xs font-medium text-grey-500 hover:text-navy"
              >
                <ArrowLeft className="h-3 w-3" />
                {t("back")}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Sticky summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-4 rounded-2xl border border-grey-100 bg-white p-5 shadow-md">
          <div className="overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={camp.image}
              alt=""
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
          <h3 className="font-anton text-lg uppercase text-navy">
            {camp.title}
          </h3>
          <ul className="flex flex-col gap-1 text-sm text-grey-700">
            <li>{camp.dateRange}</li>
            <li>{camp.location}</li>
          </ul>
          <div className="h-px bg-grey-100" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-grey-500">{t("summary.total")}</span>
            <span className="font-anton text-xl text-navy">
              {camp.formattedPrice}
            </span>
          </div>
          <p className="flex items-center gap-2 text-xs text-grey-500">
            <Lock className="h-3 w-3" />
            {t("summary.secure")}
          </p>
        </div>
      </aside>
    </div>
  );
}
