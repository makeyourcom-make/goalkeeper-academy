"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword, type AuthActionState } from "@/lib/auth/actions";

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

export function ChangePasswordForm() {
  const t = useTranslations("Account.password");
  const [state, formAction] = useFormState(changePassword, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="currentPassword"
          className="text-sm font-medium text-navy"
        >
          {t("current")}
        </label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="new-password"
            className="text-sm font-medium text-navy"
          >
            {t("new")}
          </label>
          <Input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder={t("newPlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="confirm-password"
            className="text-sm font-medium text-navy"
          >
            {t("confirm")}
          </label>
          <Input
            id="confirm-password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      {state.status === "error" && state.message && (
        <p className="text-sm text-error">{t(state.message)}</p>
      )}

      {state.status === "success" && (
        <p className="inline-flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {t(state.message)}
        </p>
      )}

      <SubmitButton idleLabel={t("submit")} pendingLabel={t("submitting")} />
    </form>
  );
}
