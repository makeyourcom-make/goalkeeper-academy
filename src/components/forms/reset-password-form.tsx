"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations, useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePassword, type AuthActionState } from "@/lib/auth/actions";

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

export function ResetPasswordForm() {
  const t = useTranslations("Auth.resetPassword");
  const locale = useLocale();
  const [state, formAction] = useFormState(updatePassword, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-2">
        <label
          htmlFor="reset-password"
          className="text-sm font-medium text-navy"
        >
          {t("passwordLabel")}
        </label>
        <Input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder={t("passwordPlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="reset-confirm"
          className="text-sm font-medium text-navy"
        >
          {t("confirmLabel")}
        </label>
        <Input
          id="reset-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          placeholder={t("confirmPlaceholder")}
        />
      </div>

      {state.status === "error" && state.message && (
        <p className="text-sm text-error">{t(state.message)}</p>
      )}

      <SubmitButton idleLabel={t("submit")} pendingLabel={t("submitting")} />
    </form>
  );
}
