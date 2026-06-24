"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SUBJECT_KEYS = ["trial", "annual", "camp", "club", "other"] as const;
type SubjectKey = (typeof SUBJECT_KEYS)[number];

type ContactFormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
  consent: boolean;
};

export function ContactForm() {
  const t = useTranslations("ContactPage.form");
  const [isSuccess, setIsSuccess] = React.useState(false);

  const schema = React.useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(2, { message: t("errors.name") }),
        email: z
          .string()
          .trim()
          .email({ message: t("errors.email") }),
        subject: z
          .string()
          .refine(
            (value): value is SubjectKey =>
              (SUBJECT_KEYS as readonly string[]).includes(value),
            { message: t("errors.subject") },
          ),
        message: z
          .string()
          .trim()
          .min(20, { message: t("errors.message") }),
        consent: z.boolean().refine((value) => value === true, {
          message: t("errors.consent"),
        }),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      consent: false,
    },
  });

  const onSubmit = handleSubmit(async () => {
    // TODO Phase 5: send to /api/contact backed by Resend
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSuccess(true);
    reset();
  });

  if (isSuccess) {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-6"
      >
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="text-grey-700">{t("success")}</p>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsSuccess(false)}
        >
          {t("submit")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="contact-name"
          className="text-sm font-semibold text-navy"
        >
          {t("fields.name.label")}
        </label>
        <Input
          id="contact-name"
          type="text"
          autoComplete="name"
          placeholder={t("fields.name.placeholder")}
          aria-invalid={Boolean(errors.name) || undefined}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-error">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="contact-email"
          className="text-sm font-semibold text-navy"
        >
          {t("fields.email.label")}
        </label>
        <Input
          id="contact-email"
          type="email"
          autoComplete="email"
          placeholder={t("fields.email.placeholder")}
          aria-invalid={Boolean(errors.email) || undefined}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-error">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="contact-subject"
          className="text-sm font-semibold text-navy"
        >
          {t("fields.subject.label")}
        </label>
        <select
          id="contact-subject"
          aria-invalid={Boolean(errors.subject) || undefined}
          {...register("subject")}
          className={cn(
            "h-11 w-full rounded-lg border border-grey-300 bg-white px-4 text-base text-grey-700 focus-visible:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30",
          )}
          defaultValue=""
        >
          <option value="" disabled>
            {t("fields.subject.placeholder")}
          </option>
          {SUBJECT_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`fields.subject.options.${key}`)}
            </option>
          ))}
        </select>
        {errors.subject && (
          <p className="text-sm text-error">{errors.subject.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="contact-message"
          className="text-sm font-semibold text-navy"
        >
          {t("fields.message.label")}
        </label>
        <textarea
          id="contact-message"
          rows={6}
          placeholder={t("fields.message.placeholder")}
          aria-invalid={Boolean(errors.message) || undefined}
          {...register("message")}
          className={cn(
            "w-full rounded-lg border border-grey-300 bg-white px-4 py-3 text-base text-grey-700 placeholder:text-grey-500 focus-visible:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30",
          )}
        />
        {errors.message && (
          <p className="text-sm text-error">{errors.message.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3 text-sm text-grey-700">
          <input
            type="checkbox"
            {...register("consent")}
            className="mt-0.5 h-4 w-4 rounded border-grey-300 text-orange focus-visible:ring-orange"
          />
          <span>{t("fields.consent")}</span>
        </label>
        {errors.consent && (
          <p className="text-sm text-error">{errors.consent.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
