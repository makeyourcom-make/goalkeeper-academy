"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createSession,
  type SessionFormState,
} from "@/lib/admin/planning-actions";

type Coach = { id: string; name: string };
type Keeper = { id: string; name: string };

const INITIAL: SessionFormState = { status: "idle", message: "" };

// Monday first (Swiss habit); value = JS getUTCDay() (0 = Sunday).
const WEEKDAYS = [
  { value: 1, key: "mon" },
  { value: 2, key: "tue" },
  { value: 3, key: "wed" },
  { value: 4, key: "thu" },
  { value: 5, key: "fri" },
  { value: 6, key: "sat" },
  { value: 0, key: "sun" },
] as const;

function SubmitButton({ label, pending }: { label: string; pending: string }) {
  const status = useFormStatus();
  return (
    <Button type="submit" disabled={status.pending}>
      {status.pending ? pending : label}
    </Button>
  );
}

export function SessionForm({
  coaches,
  keepers,
  defaultLocation,
}: {
  coaches: Coach[];
  keepers: Keeper[];
  defaultLocation: string;
}) {
  const t = useTranslations("Admin.planning.form");
  const [state, formAction] = useFormState(createSession, INITIAL);
  const [repeat, setRepeat] = React.useState("none");
  // A private slot only blocks the agenda: no keepers, no convocation.
  const [isPrivate, setIsPrivate] = React.useState(false);

  // Open the native date/time picker on click instead of forcing manual typing.
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

  const labelCls = "text-xs font-medium text-grey-500";
  const fieldCls = "flex flex-col gap-1";
  const selectCls =
    "w-full rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange";

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-2xl border border-grey-100 bg-white p-6 shadow-sm"
    >
      <h2 className="font-anton text-xl uppercase text-navy">{t("title")}</h2>

      {state.status === "success" && (
        <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-grey-700">
          <CheckCircle2 className="h-5 w-5 text-success" /> {t("success")}
        </p>
      )}

      <div className={fieldCls}>
        <label className={labelCls}>{t("sessionTitle")}</label>
        <Input
          name="title"
          required
          placeholder={t("sessionTitlePlaceholder")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className={fieldCls}>
          <label className={labelCls}>{t("date")}</label>
          <Input type="date" name="date" required onClick={openPicker} />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>{t("meetTime")}</label>
          <Input type="time" name="meetTime" required onClick={openPicker} />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>{t("startTime")}</label>
          <Input type="time" name="startTime" required onClick={openPicker} />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>{t("endTime")}</label>
          <Input type="time" name="endTime" required onClick={openPicker} />
        </div>
      </div>

      <div className={fieldCls}>
        <label className={labelCls}>{t("location")}</label>
        <Input name="location" required defaultValue={defaultLocation} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldCls}>
          <label className={labelCls}>{t("repeat")}</label>
          <select
            name="repeat"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className={selectCls}
          >
            <option value="none">{t("repeatNone")}</option>
            <option value="weekly">{t("repeatWeekly")}</option>
          </select>
        </div>
        {repeat === "weekly" && (
          <div className={fieldCls}>
            <label className={labelCls}>{t("repeatUntil")}</label>
            <Input
              type="date"
              name="repeatUntil"
              required
              onClick={openPicker}
            />
          </div>
        )}
      </div>

      {repeat === "weekly" && (
        <div className={fieldCls}>
          <label className={labelCls}>{t("repeatDays")}</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <label key={d.value} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="weekdays"
                  value={d.value}
                  className="peer sr-only"
                />
                <span className="inline-flex h-9 min-w-[2.75rem] items-center justify-center rounded-lg border border-grey-300 bg-white px-3 text-sm font-medium text-grey-700 transition peer-checked:border-orange peer-checked:bg-orange peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-orange/40">
                  {t(`days.${d.key}`)}
                </span>
              </label>
            ))}
          </div>
          <span className="text-xs text-grey-500">{t("repeatDaysHint")}</span>
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-grey-300 bg-white p-3">
        <input
          type="checkbox"
          name="isPrivate"
          value="1"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-orange"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-navy">
            {t("privateLabel")}
          </span>
          <span className="text-xs text-grey-500">{t("privateHint")}</span>
        </span>
      </label>

      <div className={fieldCls}>
        <label className={labelCls}>{t("coach")}</label>
        <select
          name="coachId"
          className="w-full rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange"
          defaultValue=""
        >
          <option value="">{t("coachNone")}</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={cn(fieldCls, isPrivate && "hidden")}>
        <label className={labelCls}>{t("keepers")}</label>
        {keepers.length === 0 ? (
          <p className="text-sm text-grey-500">{t("keepersEmpty")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {keepers.map((k) => (
              <label
                key={k.id}
                className="border-grey-200 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-navy"
              >
                <input
                  type="checkbox"
                  name="childIds"
                  value={k.id}
                  className="h-4 w-4 rounded border-grey-300 text-orange focus-visible:ring-orange"
                />
                {k.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {state.status === "error" && state.message && (
        <p className="text-sm text-error">{t(state.message)}</p>
      )}

      <SubmitButton label={t("submit")} pending={t("submitting")} />
    </form>
  );
}
