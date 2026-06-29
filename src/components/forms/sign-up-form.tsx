"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle2, Users, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/security/turnstile";
import { cn } from "@/lib/utils";
import { signUp, type AuthActionState } from "@/lib/auth/actions";

const INITIAL_STATE: AuthActionState = { status: "idle", message: "" };

function SubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

export function SignUpForm() {
  const t = useTranslations("Auth.signUp");
  const locale = useLocale();
  const [role, setRole] = React.useState<"parent" | "club">("parent");
  const [state, formAction] = useFormState(signUp, INITIAL_STATE);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-6"
      >
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="text-grey-700">{t(state.message)}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="role" value={role} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-semibold text-navy">
          {t("roleLabel")}
        </legend>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            {
              value: "parent" as const,
              Icon: Users,
              title: t("roleParent"),
              description: t("roleParentDescription"),
            },
            {
              value: "club" as const,
              Icon: Building2,
              title: t("roleClub"),
              description: t("roleClubDescription"),
            },
          ].map(({ value, Icon, title, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              aria-pressed={role === value}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition",
                role === value
                  ? "border-orange bg-orange/5 ring-2 ring-orange/30"
                  : "border-grey-300 bg-white hover:border-orange/50",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                  role === value
                    ? "bg-orange text-white"
                    : "bg-orange/10 text-orange",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-anton text-sm uppercase text-navy">
                  {title}
                </span>
                <span className="text-xs text-grey-500">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="signup-email"
          className="text-sm font-semibold text-navy"
        >
          {t("emailLabel")}
        </label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t("emailPlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="signup-password"
          className="text-sm font-semibold text-navy"
        >
          {t("passwordLabel")}
        </label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder={t("passwordPlaceholder")}
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-grey-700">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 h-4 w-4 rounded border-grey-300 text-orange focus-visible:ring-orange"
        />
        <span>{t("consentLabel")}</span>
      </label>

      <Turnstile />

      {state.status === "error" && state.message && (
        <p className="text-sm text-error">{t(state.message)}</p>
      )}

      <SubmitButton idleLabel={t("submit")} pendingLabel={t("submitting")} />
    </form>
  );
}
