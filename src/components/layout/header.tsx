"use client";

import * as React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/academie", key: "academy" },
  { href: "/offres", key: "offers" },
  { href: "/stages", key: "camps" },
  { href: "/blog", key: "blog" },
  { href: "/contact", key: "contact" },
] as const;

export function Header() {
  const t = useTranslations("Header");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [isAuthed, setIsAuthed] = React.useState(false);

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: User | null } }) => {
        if (!cancelled) setIsAuthed(Boolean(data.user));
      });
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setIsAuthed(Boolean(session?.user));
      },
    );
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    startTransition(() => {
      // pathname is a runtime string; cast to the router's expected href type
      // which excludes dynamic segments from the typed-routes union.
      type ReplaceHref = Parameters<typeof router.replace>[0];
      router.replace(pathname as ReplaceHref, { locale: next });
    });
  };

  const renderLocaleSwitch = (className?: string) => (
    <div
      role="group"
      aria-label={t("localeGroup")}
      className={cn(
        "flex items-center rounded-full border border-grey-300 p-0.5 text-xs font-semibold",
        isPending && "opacity-60",
        className,
      )}
    >
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => switchLocale(code)}
          disabled={isPending}
          className={cn(
            "rounded-full px-3 py-1 uppercase transition-colors",
            locale === code
              ? "bg-navy text-white"
              : "text-grey-500 hover:text-navy",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-transparent transition-all duration-200",
        scrolled
          ? "border-grey-100 bg-white/90 shadow-sm backdrop-blur"
          : "bg-white",
      )}
    >
      <div className="container flex h-20 items-center justify-between gap-4 lg:h-24">
        <Link
          href="/"
          aria-label={t("homeAriaLabel")}
          className="flex items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <Image
            src="/logos/Logo-transparent.png"
            alt="Goalkeeper Academy"
            width={160}
            height={160}
            priority
            className="h-14 w-auto lg:h-20"
          />
          <span className="hidden font-anton text-lg uppercase tracking-wide text-navy sm:inline">
            Goalkeeper Academy
          </span>
        </Link>

        <nav
          aria-label={t("primaryNav")}
          className="hidden items-center gap-8 lg:flex"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-navy transition-colors hover:text-orange"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {renderLocaleSwitch()}
          <Button asChild variant="primary" size="sm">
            {isAuthed ? (
              <Link href="/mon-compte">{t("account")}</Link>
            ) : (
              <Link href="/connexion">{t("login")}</Link>
            )}
          </Button>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-navy hover:bg-grey-100 lg:hidden"
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav"
          className="border-t border-grey-100 bg-white lg:hidden"
        >
          <div className="container flex flex-col gap-1 py-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-semibold text-navy hover:bg-grey-100"
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-grey-100 pt-4">
              {renderLocaleSwitch()}
              <Button asChild variant="primary" size="sm">
                {isAuthed ? (
                  <Link href="/mon-compte" onClick={() => setMobileOpen(false)}>
                    {t("account")}
                  </Link>
                ) : (
                  <Link href="/connexion" onClick={() => setMobileOpen(false)}>
                    {t("login")}
                  </Link>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
