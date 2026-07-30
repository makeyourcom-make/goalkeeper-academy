"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendAdminEmail, type EmailFormState } from "@/lib/admin/email-actions";

const INITIAL: EmailFormState = { status: "idle", message: "" };

type Contact = { email: string; name: string };

const inputClass =
  "rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange";

function SubmitButton() {
  const t = useTranslations("Admin.emails");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Send className="mr-2 h-4 w-4" />
      {pending ? t("sending") : t("send")}
    </Button>
  );
}

export function EmailComposer({ contacts }: { contacts: Contact[] }) {
  const t = useTranslations("Admin.emails");
  const [state, action] = useFormState(sendAdminEmail, INITIAL);
  const [showCc, setShowCc] = useState(false);

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-grey-100 bg-white p-6 shadow-sm"
    >
      <h2 className="font-anton text-lg uppercase text-navy">
        {t("composeTitle")}
      </h2>

      <datalist id="email-contacts">
        {contacts.map((c) => (
          <option key={c.email} value={c.email}>
            {c.name}
          </option>
        ))}
      </datalist>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-grey-500">{t("to")}</span>
        <input
          name="to"
          list="email-contacts"
          required
          placeholder={t("toPlaceholder")}
          className={inputClass}
        />
      </label>

      {showCc ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-grey-500">{t("cc")}</span>
            <input
              name="cc"
              list="email-contacts"
              placeholder={t("optional")}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-grey-500">
              {t("bcc")}
            </span>
            <input
              name="bcc"
              list="email-contacts"
              placeholder={t("optional")}
              className={inputClass}
            />
          </label>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCc(true)}
          className="self-start text-xs font-medium text-orange hover:text-orange-600"
        >
          {t("addCc")}
        </button>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-grey-500">
          {t("subject")}
        </span>
        <input name="subject" required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-grey-500">
          {t("message")}
        </span>
        <textarea
          name="message"
          required
          rows={9}
          className={`${inputClass} resize-y`}
        />
      </label>

      {state.status === "success" && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
          {t("sent")}
        </p>
      )}
      {state.status === "error" && (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">
          {t(`errors.${state.message}`)}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-grey-500">{t("fromNote")}</p>
        <SubmitButton />
      </div>
    </form>
  );
}
