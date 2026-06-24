import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  LayoutDashboard,
  Users,
  Baby,
  Receipt,
  CalendarDays,
  CalendarRange,
  Dumbbell,
  Wallet,
  Calculator,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.nav" });

  if (!isSupabaseConfigured()) {
    redirect(`/${locale}/connexion`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/connexion`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect(`/${locale}/mon-compte`);
  }

  const NAV: {
    href:
      | "/admin"
      | "/admin/parents"
      | "/admin/enfants"
      | "/admin/entraineurs"
      | "/admin/planning"
      | "/admin/factures"
      | "/admin/stages"
      | "/admin/charges"
      | "/admin/comptabilite";
    label: string;
    Icon: typeof LayoutDashboard;
  }[] = [
    { href: "/admin", label: t("dashboard"), Icon: LayoutDashboard },
    { href: "/admin/parents", label: t("parents"), Icon: Users },
    { href: "/admin/enfants", label: t("children"), Icon: Baby },
    { href: "/admin/entraineurs", label: t("coaches"), Icon: Dumbbell },
    { href: "/admin/planning", label: t("planning"), Icon: CalendarRange },
    { href: "/admin/stages", label: t("camps"), Icon: CalendarDays },
    { href: "/admin/factures", label: t("invoices"), Icon: Receipt },
    { href: "/admin/charges", label: t("expenses"), Icon: Wallet },
    { href: "/admin/comptabilite", label: t("accounting"), Icon: Calculator },
  ];

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-grey-100/40 lg:flex-row">
      <aside className="border-b border-grey-100 bg-navy text-white lg:w-64 lg:border-b-0 lg:border-r">
        <div className="container py-6 lg:px-6 lg:py-8">
          <p className="font-anton text-xl uppercase text-orange">
            {t("title")}
          </p>
          <p className="mt-1 text-xs text-white/60">{t("subtitle")}</p>
          <nav className="mt-6 flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {NAV.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
