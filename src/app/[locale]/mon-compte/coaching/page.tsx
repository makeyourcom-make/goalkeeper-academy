import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarRange, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Props = { params: Promise<{ locale: string }> };

type SessionRow = {
  id: string;
  title: string;
  location: string | null;
  meet_at: string | null;
  starts_at: string;
  ends_at: string;
  session_attendees: {
    children: { first_name: string | null; last_name: string | null } | null;
  }[];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account.coaching" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

const hhmm = (iso: string | null) => (iso ? iso.slice(11, 16) : "");

export default async function CoachingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account.coaching");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/connexion`);

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!coach) redirect(`/${locale}/mon-compte`);

  // Coaches can't read keeper names via RLS — fetch with the service-role
  // client, strictly scoped to this coach's own sessions.
  const admin = createSupabaseAdminClient();
  const { data: sessions } = await admin
    .from("sessions")
    .select(
      "id, title, location, meet_at, starts_at, ends_at, session_attendees(children(first_name, last_name))",
    )
    .eq("coach_id", coach.id)
    .gte("starts_at", new Date().toISOString())
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true })
    .returns<SessionRow[]>();

  const list = sessions ?? [];
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col gap-4 py-16 lg:py-20">
          <Badge variant="orange" className="self-start">
            {t("eyebrow")}
          </Badge>
          <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">{t("subtitle")}</p>
          <Button asChild variant="ghost" className="self-start">
            <Link href="/mon-compte">{t("backToDashboard")}</Link>
          </Button>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="container flex max-w-3xl flex-col gap-3">
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-grey-300 bg-grey-100/40 p-10 text-center">
              <CalendarRange className="h-8 w-8 text-orange" />
              <p className="text-sm text-grey-700">{t("empty")}</p>
            </div>
          ) : (
            list.map((s) => {
              const keepers = (s.session_attendees ?? [])
                .map((a) =>
                  `${a.children?.first_name ?? ""} ${a.children?.last_name ?? ""}`.trim(),
                )
                .filter(Boolean);
              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 rounded-xl border border-grey-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-anton text-lg uppercase text-navy">
                      {s.title}
                    </h2>
                    <span className="text-sm font-medium capitalize text-navy">
                      {dateFmt.format(new Date(s.starts_at))}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-grey-700">
                    <span>
                      {t("meet")} {hhmm(s.meet_at) || hhmm(s.starts_at)} ·{" "}
                      {hhmm(s.starts_at)}–{hhmm(s.ends_at)}
                    </span>
                    {s.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="text-grey-400 h-3.5 w-3.5" />
                        {s.location}
                      </span>
                    )}
                  </div>
                  <div className="inline-flex items-center gap-2 text-sm text-grey-500">
                    <Users className="text-grey-400 h-4 w-4" />
                    {keepers.length > 0
                      ? `${t("keepers")} (${keepers.length}) : ${keepers.join(", ")}`
                      : t("noKeepers")}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
