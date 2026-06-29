"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/security/turnstile";
import { requestPasswordReset, type AuthActionState } from "@/lib/auth/actions";

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

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword");
  const locale = useLocale();
  const [state, formAction] = useFormState(requestPasswordReset, INITIAL_STATE);

  if (state.status === "success") {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-grey-700">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        {t(state.message)}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-2">
        <label
          htmlFor="forgot-email"
          className="text-sm font-semibold text-navy"
        >
          {t("emailLabel")}
        </label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t("emailPlaceholder")}
        />
      </div>

      <Turnstile />

      {state.status === "error" && state.message && (
        <p className="text-sm text-error">{t(state.message)}</p>
      )}

      <SubmitButton idleLabel={t("submit")} pendingLabel={t("submitting")} />
    </form>
  );
}
