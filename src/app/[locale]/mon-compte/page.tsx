import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Users,
  Calendar,
  FileText,
  UserCircle,
  LayoutDashboard,
  CalendarRange,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";

import { getAccountContext } from "@/lib/account/view-context";
import { signOut } from "@/lib/auth/actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

type CardKey = "children" | "planning" | "invoices";

const CARDS: {
  key: CardKey;
  Icon: LucideIcon;
  href: "/mon-compte/enfants" | "/mon-compte/planning" | "/mon-compte/factures";
}[] = [
  { key: "children", Icon: Users, href: "/mon-compte/enfants" },
  { key: "planning", Icon: Calendar, href: "/mon-compte/planning" },
  { key: "invoices", Icon: FileText, href: "/mon-compte/factures" },
];

const COACH_CARDS: {
  key: "coaching" | "remunerations" | "invoices";
  Icon: LucideIcon;
  href:
    | "/mon-compte/coaching"
    | "/mon-compte/remunerations"
    | "/mon-compte/factures";
}[] = [
  { key: "coaching", Icon: CalendarRange, href: "/mon-compte/coaching" },
  { key: "remunerations", Icon: Wallet, href: "/mon-compte/remunerations" },
  { key: "invoices", Icon: FileText, href: "/mon-compte/factures" },
];

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account");

  const ctx = await getAccountContext();
  if (!ctx) redirect(`/${locale}/connexion`);

  let displayName = "";
  let role = "parent";
  const { data: profile } = await ctx.db
    .from("profiles")
    .select("first_name, role")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (profile?.first_name) displayName = profile.first_name;
  if (profile?.role) role = profile.role;

  // What to call the people managed by this account.
  const memberKey =
    role === "club" ? "players" : role === "parent" ? "children" : "keepers";
  const members = t(`terms.${memberKey}`);

  // Counts (filtered explicitly by the effective account owner).
  const [{ count: childrenCount }, { count: invoicesCount }] =
    await Promise.all([
      ctx.db
        .from("children")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", ctx.userId),
      ctx.db
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", ctx.userId),
    ]);

  const counts: Record<CardKey, number> = {
    children: childrenCount ?? 0,
    planning: 0,
    invoices: invoicesCount ?? 0,
  };

  return (
    <>
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col gap-4 py-16 lg:py-20">
          <Badge variant="orange" className="self-start">
            {t("hero.eyebrow")}
          </Badge>
          <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
            {t("hero.greeting", { name: displayName })}
          </h1>
          <p className="text-lg text-grey-500">
            {t("hero.subtitle", { members })}
          </p>
          {!ctx.isImpersonating && (
            <div className="flex flex-wrap gap-3">
              {role === "admin" && (
                <Button asChild variant="primary">
                  <Link href="/admin">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t("adminConsole")}
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link href="/mon-compte/profil">
                  <UserCircle className="mr-2 h-4 w-4" />
                  {t("editProfile")}
                </Link>
              </Button>
              <form action={signOut}>
                <input type="hidden" name="locale" value={locale} />
                <Button type="submit" variant="ghost">
                  {t("logout")}
                </Button>
              </form>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="container grid gap-6 md:grid-cols-3">
          {(role === "coach" ? COACH_CARDS : CARDS).map(
            ({ key, Icon, href }) => {
              const count = role === "coach" ? null : counts[key as CardKey];
              return (
                <Link
                  key={key}
                  href={href}
                  className="group flex flex-col gap-3 rounded-xl border border-grey-100 bg-white p-6 shadow-sm transition hover:border-orange/40 hover:shadow-md"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange/10 text-orange">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h2 className="font-anton text-xl uppercase text-navy">
                    {t(`cards.${key}.title`)}
                  </h2>
                  <p className="text-sm text-grey-700">
                    {t(`cards.${key}.description`, { members })}
                  </p>
                  {count !== null && (
                    <p className="mt-2 text-xs text-grey-500">
                      {count > 0
                        ? t(`cards.${key}.count`, { count })
                        : t(`cards.${key}.empty`)}
                    </p>
                  )}
                  <span className="mt-auto inline-flex w-fit rounded-full bg-grey-100 px-3 py-1 text-xs font-medium text-grey-700 group-hover:bg-orange group-hover:text-white">
                    {t(`cards.${key}.cta`)}
                  </span>
                </Link>
              );
            },
          )}
        </div>
      </section>
    </>
  );
}
