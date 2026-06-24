"use client";

import * as React from "react";
import Image from "next/image";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2, Upload, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile, type ProfileActionState } from "@/lib/account/actions";
import type { Profile } from "@/types/database";

const INITIAL_STATE: ProfileActionState = { status: "idle", message: "" };

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

export function ProfileForm({
  profile,
  isCoach = false,
}: {
  profile: Profile;
  isCoach?: boolean;
}) {
  const t = useTranslations("Account.profile");
  const [state, formAction] = useFormState(updateProfile, INITIAL_STATE);
  const [preview, setPreview] = React.useState<string | null>(
    profile.avatar_url,
  );

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <span className="border-grey-200 text-grey-400 relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-grey-100">
          {preview ? (
            <Image
              src={preview}
              alt={t("avatarAlt")}
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
            htmlFor="avatar"
            className="inline-flex cursor-pointer items-center gap-2 self-start rounded-lg border border-grey-300 px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-grey-100"
          >
            <Upload className="h-4 w-4" />
            {t("avatarUpload")}
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onAvatarChange}
          />
          <span className="text-xs text-grey-500">{t("avatarHint")}</span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="first_name"
            className="text-sm font-semibold text-navy"
          >
            {t("firstName")}
          </label>
          <Input
            id="first_name"
            name="first_name"
            type="text"
            autoComplete="given-name"
            required
            defaultValue={profile.first_name ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="last_name"
            className="text-sm font-semibold text-navy"
          >
            {t("lastName")}
          </label>
          <Input
            id="last_name"
            name="last_name"
            type="text"
            autoComplete="family-name"
            required
            defaultValue={profile.last_name ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="text-sm font-semibold text-navy">
          {t("phone")}
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder={t("phonePlaceholder")}
          defaultValue={profile.phone ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="language" className="text-sm font-semibold text-navy">
          {t("language")}
        </label>
        <select
          id="language"
          name="language"
          defaultValue={profile.language}
          className="h-11 rounded-lg border border-grey-300 bg-white px-3 text-sm text-navy focus:border-navy focus:outline-none"
        >
          <option value="fr">{t("languageFr")}</option>
          <option value="en">{t("languageEn")}</option>
        </select>
      </div>

      {isCoach && (
        <div className="flex flex-col gap-2 rounded-lg border border-orange/30 bg-orange/5 p-4">
          <label htmlFor="iban" className="text-sm font-semibold text-navy">
            {t("iban")}
          </label>
          <Input
            id="iban"
            name="iban"
            type="text"
            inputMode="text"
            placeholder="CH00 0000 0000 0000 0000 0"
            defaultValue={profile.iban ?? ""}
          />
          <span className="text-xs text-grey-500">{t("ibanHint")}</span>
        </div>
      )}

      <label className="flex items-start gap-3 rounded-lg border border-grey-100 bg-grey-100/40 p-4">
        <input
          type="checkbox"
          name="marketing_consent"
          defaultChecked={profile.marketing_consent}
          className="mt-1 h-4 w-4 rounded border-grey-300"
        />
        <span className="text-sm text-grey-700">{t("marketingConsent")}</span>
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

      <SubmitButton idleLabel={t("submit")} pendingLabel={t("submitting")} />
    </form>
  );
}
