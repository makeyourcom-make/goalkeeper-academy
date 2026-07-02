import type { SupabaseClient } from "@supabase/supabase-js";

import { isEmailConfigured, sendMail } from "@/lib/email/smtp";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thelastline.ch";

type ChildRow = {
  first_name: string | null;
  last_name: string | null;
  profiles: { email: string; language: string | null } | null;
};

function frDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// Parent email + child name + language for a set of children.
async function recipients(
  admin: SupabaseClient,
  childIds: string[],
): Promise<{ email: string; childName: string; en: boolean }[]> {
  if (childIds.length === 0) return [];
  const { data } = await admin
    .from("children")
    .select("first_name, last_name, profiles(email, language)")
    .in("id", childIds)
    .returns<ChildRow[]>();
  return (data ?? [])
    .filter((c) => c.profiles?.email)
    .map((c) => ({
      email: c.profiles!.email,
      childName: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
      en: c.profiles!.language === "en",
    }));
}

export type ConvocationParams = {
  childIds: string[];
  title: string;
  location: string;
  meetTime: string; // "HH:mm"
  startTime: string;
  endTime: string;
  firstDate: string; // "YYYY-MM-DD"
  seriesUntil?: string | null; // set when it recurs weekly
  seriesCount?: number;
};

// Emails a convocation to each convened keeper's parent when they are added to
// a session (or a weekly series). Best-effort: no-ops without SMTP.
export async function sendConvocations(
  admin: SupabaseClient,
  p: ConvocationParams,
): Promise<void> {
  if (!isEmailConfigured() || p.childIds.length === 0) return;
  const people = await recipients(admin, p.childIds);
  const invoicesUrl = (en: boolean) =>
    `${SITE}/${en ? "en/account/schedule" : "fr/mon-compte/planning"}`;

  await Promise.all(
    people.map(({ email, childName, en }) => {
      const isSeries = Boolean(p.seriesUntil && (p.seriesCount ?? 1) > 1);
      const when = en
        ? isSeries
          ? `Every week from ${frDate(p.firstDate)} to ${frDate(p.seriesUntil!)} (${p.seriesCount} sessions)`
          : frDate(p.firstDate)
        : isSeries
          ? `Chaque semaine du ${frDate(p.firstDate)} au ${frDate(p.seriesUntil!)} (${p.seriesCount} séances)`
          : frDate(p.firstDate);

      const subject = `Convocation — ${p.title}`;

      const body = en
        ? `Hello,

${childName || "Your goalkeeper"} is convened to a training session:

Date: ${when}
Call time: ${p.meetTime}
Session: ${p.startTime}–${p.endTime}
Place: ${p.location}
Session: ${p.title}

Please arrive at the call time. Let us know if you cannot attend.${
            isSeries ? "\nYou will get a reminder before each session." : ""
          }

Your schedule: ${invoicesUrl(true)}

See you on the pitch!
The Last Line team`
        : `Bonjour,

${childName || "Votre gardien·ne"} est convoqué·e à un entraînement :

Date : ${when}
Convocation : ${p.meetTime}
Séance : ${p.startTime}–${p.endTime}
Lieu : ${p.location}
Intitulé : ${p.title}

Merci d'être présent·e à l'heure de convocation. Prévenez-nous en cas d'empêchement.${
            isSeries ? "\nVous recevrez un rappel avant chaque séance." : ""
          }

Votre planning : ${invoicesUrl(false)}

À très vite sur le terrain !
L'équipe The Last Line`;

      return sendMail({ to: email, subject, text: body });
    }),
  );
}

type CoachRow = {
  profiles: {
    email: string;
    language: string | null;
    first_name: string | null;
  } | null;
};

export type CoachConvocationParams = {
  coachId: string;
  title: string;
  location: string;
  meetTime: string;
  startTime: string;
  endTime: string;
  firstDate: string;
  seriesUntil?: string | null;
  seriesCount?: number;
  keeperCount: number;
};

// Notifies the assigned coach when they are put on a session (or a weekly
// series). Best-effort: no-ops without SMTP or a coach email.
export async function sendCoachConvocation(
  admin: SupabaseClient,
  p: CoachConvocationParams,
): Promise<void> {
  if (!isEmailConfigured() || !p.coachId) return;
  const { data } = await admin
    .from("coaches")
    .select("profiles(email, language, first_name)")
    .eq("id", p.coachId)
    .maybeSingle<CoachRow>();
  const email = data?.profiles?.email;
  if (!email) return;

  const en = data.profiles!.language === "en";
  const name = data.profiles!.first_name ?? "";
  const isSeries = Boolean(p.seriesUntil && (p.seriesCount ?? 1) > 1);
  const when = en
    ? isSeries
      ? `Every week from ${frDate(p.firstDate)} to ${frDate(p.seriesUntil!)} (${p.seriesCount} sessions)`
      : frDate(p.firstDate)
    : isSeries
      ? `Chaque semaine du ${frDate(p.firstDate)} au ${frDate(p.seriesUntil!)} (${p.seriesCount} séances)`
      : frDate(p.firstDate);

  const subject = en
    ? `Coaching assignment — ${p.title}`
    : `Vous êtes convoqué·e (coach) — ${p.title}`;

  const body = en
    ? `Hello${name ? ` ${name}` : ""},

You are assigned as the coach for ${isSeries ? "a weekly training series" : "a training session"}:

Date: ${when}
Call time: ${p.meetTime}
Session: ${p.startTime}–${p.endTime}
Place: ${p.location}
Session: ${p.title}
Convened goalkeepers: ${p.keeperCount}

Thanks for being there!
The Last Line team`
    : `Bonjour${name ? ` ${name}` : ""},

Vous êtes désigné·e comme entraîneur pour ${isSeries ? "des entraînements hebdomadaires" : "un entraînement"} :

Date : ${when}
Convocation : ${p.meetTime}
Séance : ${p.startTime}–${p.endTime}
Lieu : ${p.location}
Intitulé : ${p.title}
Gardiens convoqués : ${p.keeperCount}

Merci de votre présence !
L'équipe The Last Line`;

  await sendMail({ to: email, subject, text: body });
}

// Reminder to the coach a few days before a session they run.
export async function sendCoachReminder(
  admin: SupabaseClient,
  p: {
    coachId: string;
    title: string;
    location: string;
    meetTime: string;
    startTime: string;
    endTime: string;
    date: string;
    inDays: number;
    keeperCount: number;
  },
): Promise<void> {
  if (!isEmailConfigured() || !p.coachId) return;
  const { data } = await admin
    .from("coaches")
    .select("profiles(email, language, first_name)")
    .eq("id", p.coachId)
    .maybeSingle<CoachRow>();
  const email = data?.profiles?.email;
  if (!email) return;

  const en = data.profiles!.language === "en";
  const name = data.profiles!.first_name ?? "";
  const subject = en
    ? `Reminder (coach) — ${p.title} in ${p.inDays} days`
    : `Rappel (coach) — ${p.title} dans ${p.inDays} jours`;
  const body = en
    ? `Hello${name ? ` ${name}` : ""},

Reminder: you coach a session in ${p.inDays} days.

Date: ${frDate(p.date)}
Call time: ${p.meetTime}
Session: ${p.startTime}–${p.endTime}
Place: ${p.location}
Session: ${p.title}
Convened goalkeepers: ${p.keeperCount}

The Last Line team`
    : `Bonjour${name ? ` ${name}` : ""},

Rappel : vous encadrez un entraînement dans ${p.inDays} jours.

Date : ${frDate(p.date)}
Convocation : ${p.meetTime}
Séance : ${p.startTime}–${p.endTime}
Lieu : ${p.location}
Intitulé : ${p.title}
Gardiens convoqués : ${p.keeperCount}

L'équipe The Last Line`;

  await sendMail({ to: email, subject, text: body });
}

export type ReminderParams = {
  childIds: string[];
  title: string;
  location: string;
  meetTime: string; // "HH:mm"
  startTime: string;
  endTime: string;
  date: string; // "YYYY-MM-DD"
  inDays: number;
};

// Reminder sent a few days before a session, with the practical details.
export async function sendReminders(
  admin: SupabaseClient,
  p: ReminderParams,
): Promise<void> {
  if (!isEmailConfigured() || p.childIds.length === 0) return;
  const people = await recipients(admin, p.childIds);

  await Promise.all(
    people.map(({ email, childName, en }) => {
      const subject = en
        ? `Reminder — ${p.title} in ${p.inDays} days`
        : `Rappel — ${p.title} dans ${p.inDays} jours`;

      const body = en
        ? `Hello,

Reminder: ${childName || "your goalkeeper"} has a training session in ${p.inDays} days.

Date: ${frDate(p.date)}
Call time: ${p.meetTime}
Session: ${p.startTime}–${p.endTime}
Place: ${p.location}
Session: ${p.title}

Please arrive at the call time. Let us know if you cannot attend.

See you on the pitch!
The Last Line team`
        : `Bonjour,

Rappel : ${childName || "votre gardien·ne"} a un entraînement dans ${p.inDays} jours.

Date : ${frDate(p.date)}
Convocation : ${p.meetTime}
Séance : ${p.startTime}–${p.endTime}
Lieu : ${p.location}
Intitulé : ${p.title}

Merci d'être présent·e à l'heure de convocation. Prévenez-nous en cas d'empêchement.

À très vite sur le terrain !
L'équipe The Last Line`;

      return sendMail({ to: email, subject, text: body });
    }),
  );
}
