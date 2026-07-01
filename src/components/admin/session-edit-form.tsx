"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateSession,
  type SessionFormState,
} from "@/lib/admin/planning-actions";

type Coach = { id: string; name: string };
type Keeper = { id: string; name: string };

export type SessionEditData = {
  id: string;
  title: string;
  date: string;
  meetTime: string;
  startTime: string;
  endTime: string;
  location: string;
  coachId: string;
  childIds: string[];
};

const INITIAL: SessionFormState = { status: "idle", message: "" };

function SubmitButton({ label, pending }: { label: string; pending: string }) {
  const status = useFormStatus();
  return (
    <Button type="submit" disabled={status.pending}>
      {status.pending ? pending : label}
    </Button>
  );
}

export function SessionEditForm({
  session,
  coaches,
  keepers,
}: {
  session: SessionEditData;
  coaches: Coach[];
  keepers: Keeper[];
}) {
  const t = useTranslations("Admin.planning.form");
  const [state, formAction] = useFormState(updateSession, INITIAL);

  function openPicker(e: React.MouseEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
      } catch {
        /* ignore */
      }
    }
  }

  const labelCls = "text-xs font-medium text-grey-500";
  const fieldCls = "flex flex-col gap-1";
  const selectCls =
    "w-full rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange";
  const checked = new Set(session.childIds);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-2xl border border-grey-100 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="id" value={session.id} />
      <h2 className="font-anton text-xl uppercase text-navy">
        {t("editTitle")}
      </h2>

      {state.status === "success" && (
        <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-grey-700">
          <CheckCircle2 className="h-5 w-5 text-success" /> {t("editSuccess")}
        </p>
      )}

      <div className={fieldCls}>
        <label className={labelCls}>{t("sessionTitle")}</label>
        <Input name="title" required defaultValue={session.title} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className={fieldCls}>
          <label className={labelCls}>{t("date")}</label>
          <Input
            type="date"
            name="date"
            required
            defaultValue={session.date}
            onClick={openPicker}
          />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>{t("meetTime")}</label>
          <Input
            type="time"
            name="meetTime"
            required
            defaultValue={session.meetTime}
            onClick={openPicker}
          />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>{t("startTime")}</label>
          <Input
            type="time"
            name="startTime"
            required
            defaultValue={session.startTime}
            onClick={openPicker}
          />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>{t("endTime")}</label>
          <Input
            type="time"
            name="endTime"
            required
            defaultValue={session.endTime}
            onClick={openPicker}
          />
        </div>
      </div>

      <div className={fieldCls}>
        <label className={labelCls}>{t("location")}</label>
        <Input name="location" required defaultValue={session.location} />
      </div>

      <div className={fieldCls}>
        <label className={labelCls}>{t("coach")}</label>
        <select
          name="coachId"
          className={selectCls}
          defaultValue={session.coachId}
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
                  defaultChecked={checked.has(k.id)}
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

      <SubmitButton label={t("editSubmit")} pending={t("submitting")} />
    </form>
  );
}
