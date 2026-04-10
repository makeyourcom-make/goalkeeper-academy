"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithMagicLink, type AuthActionState } from "@/lib/auth/actions";

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

export function SignInForm() {
  const t = useTranslations("Auth.signIn");
  const locale = useLocale();
  const [state, formAction] = useFormState(signInWithMagicLink, INITIAL_STATE);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-6"
      >
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="text-grey-700">{t("success")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-2">
        <label
          htmlFor="signin-email"
          className="text-sm font-semibold text-navy"
        >
          {t("emailLabel")}
        </label>
        <Input
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t("emailPlaceholder")}
        />
      </div>

      {state.status === "error" && state.message && (
        <p className="text-sm text-error">{t(state.message)}</p>
      )}

      <SubmitButton idleLabel={t("submit")} pendingLabel={t("submitting")} />
    </form>
  );
}
