"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createSession,
  type SessionFormState,
} from "@/lib/admin/planning-actions";

type Coach = { id: string; name: string };
type Keeper = { id: string; name: string };

const INITIAL: SessionFormState = { status: "idle", message: "" };

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

      <div className={fieldCls}>
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
