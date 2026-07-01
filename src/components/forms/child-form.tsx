"use client";

import * as React from "react";
import Image from "next/image";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle2, Upload, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createChild,
  updateChild,
  type ChildActionState,
} from "@/lib/account/children-actions";
import type { Child } from "@/types/database";

const INITIAL_STATE: ChildActionState = { status: "idle", message: "" };

const LEVELS = ["debutant", "intermediaire", "avance", "competition"] as const;
const HANDS = ["droite", "gauche", "ambidextre"] as const;

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

export function ChildForm({
  mode,
  child,
  initialPhotoUrl = null,
}: {
  mode: "create" | "edit";
  child?: Child;
  initialPhotoUrl?: string | null;
}) {
  const t = useTranslations("Account.children");
  const locale = useLocale();
  const action = mode === "create" ? createChild : updateChild;
  const [state, formAction] = useFormState(action, INITIAL_STATE);
  const [preview, setPreview] = React.useState<string | null>(initialPhotoUrl);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  function openPicker(e: React.MouseEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
      } catch {
        /* showPicker can throw outside a user gesture; ignore */
      }
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {mode === "edit" && child && (
        <input type="hidden" name="id" value={child.id} />
      )}

      {/* Photo */}
      <div className="flex items-center gap-5">
        <span className="border-grey-200 text-grey-400 relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-grey-100">
          {preview ? (
            <Image
              src={preview}
              alt={t("photoAlt")}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <User className="h-8 w-8" />
          )}
        </span>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="photo"
            className="inline-flex cursor-pointer items-center gap-2 self-start rounded-lg border border-grey-300 px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-grey-100"
          >
            <Upload className="h-4 w-4" />
            {t("photoUpload")}
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPhotoChange}
          />
          <span className="text-xs text-grey-500">{t("photoHint")}</span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="first_name" className="text-sm font-medium text-navy">
            {t("firstName")}
          </label>
          <Input
            id="first_name"
            name="first_name"
            required
            defaultValue={child?.first_name ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="last_name" className="text-sm font-medium text-navy">
            {t("lastName")}
          </label>
          <Input
            id="last_name"
            name="last_name"
            required
            defaultValue={child?.last_name ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="birth_date" className="text-sm font-medium text-navy">
            {t("birthDate")}
          </label>
          <Input
            id="birth_date"
            name="birth_date"
            type="date"
            required
            defaultValue={child?.birth_date ?? ""}
            onClick={openPicker}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="dominant_hand"
            className="text-sm font-medium text-navy"
          >
            {t("dominantHand")}
          </label>
          <select
            id="dominant_hand"
            name="dominant_hand"
            defaultValue={child?.dominant_hand ?? ""}
            className="h-11 rounded-lg border border-grey-300 bg-white px-3 text-sm text-navy focus:border-navy focus:outline-none"
          >
            <option value="">{t("notSpecified")}</option>
            {HANDS.map((h) => (
              <option key={h} value={h}>
                {t(`hands.${h}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="level" className="text-sm font-medium text-navy">
          {t("level")}
        </label>
        <select
          id="level"
          name="level"
          defaultValue={child?.level ?? ""}
          className="h-11 rounded-lg border border-grey-300 bg-white px-3 text-sm text-navy focus:border-navy focus:outline-none"
        >
          <option value="">{t("notSpecified")}</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {t(`levels.${l}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="medical_notes"
          className="text-sm font-medium text-navy"
        >
          {t("medicalNotes")}
        </label>
        <textarea
          id="medical_notes"
          name="medical_notes"
          rows={4}
          defaultValue={child?.medical_notes ?? ""}
          placeholder={t("medicalNotesPlaceholder")}
          className="rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none"
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-grey-100 bg-grey-100/40 p-4">
        <input
          type="checkbox"
          name="photo_consent"
          defaultChecked={child?.photo_consent ?? false}
          className="mt-1 h-4 w-4 rounded border-grey-300"
        />
        <span className="text-sm text-grey-700">{t("photoConsent")}</span>
      </label>

      {state.status === "error" && state.message && (
        <p className="text-sm text-error">{t(state.message)}</p>
      )}

      {state.status === "success" && (
        <p className="inline-flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {t("success")}
        </p>
      )}

      <SubmitButton
        idleLabel={mode === "create" ? t("submitCreate") : t("submitUpdate")}
        pendingLabel={t("submitting")}
      />
    </form>
  );
}
