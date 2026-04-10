"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/academie", label: "Académie" },
  { href: "/offres", label: "Offres & tarifs" },
  { href: "/stages", label: "Stages" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
] as const;

const LOCALES = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [activeLocale, setActiveLocale] = React.useState<"fr" | "en">("fr");

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

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-transparent transition-all duration-200",
        scrolled
          ? "border-grey-100 bg-white/90 shadow-sm backdrop-blur"
          : "bg-white",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 lg:h-20">
        <Link
          href="/"
          aria-label="Goalkeeper Academy — Accueil"
          className="flex items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <Image
            src="/logos/Logo-transparent.png"
            alt="Goalkeeper Academy"
            width={48}
            height={48}
            priority
            className="h-10 w-auto lg:h-12"
          />
          <span className="hidden font-anton text-lg uppercase tracking-wide text-navy sm:inline">
            Goalkeeper Academy
          </span>
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-8 lg:flex"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-navy transition-colors hover:text-orange"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div
            role="group"
            aria-label="Choix de la langue"
            className="flex items-center rounded-full border border-grey-300 p-0.5 text-xs font-semibold"
          >
            {LOCALES.map((locale) => (
              <button
                key={locale.code}
                type="button"
                aria-pressed={activeLocale === locale.code}
                onClick={() => setActiveLocale(locale.code)}
                className={cn(
                  "rounded-full px-3 py-1 transition-colors",
                  activeLocale === locale.code
                    ? "bg-navy text-white"
                    : "text-grey-500 hover:text-navy",
                )}
              >
                {locale.label}
              </button>
            ))}
          </div>
          <Button asChild variant="primary" size="sm">
            <Link href="/connexion">Connexion</Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
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
                {item.label}
              </Link>
            ))}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-grey-100 pt-4">
              <div
                role="group"
                aria-label="Choix de la langue"
                className="flex items-center rounded-full border border-grey-300 p-0.5 text-xs font-semibold"
              >
                {LOCALES.map((locale) => (
                  <button
                    key={locale.code}
                    type="button"
                    aria-pressed={activeLocale === locale.code}
                    onClick={() => setActiveLocale(locale.code)}
                    className={cn(
                      "rounded-full px-3 py-1 transition-colors",
                      activeLocale === locale.code
                        ? "bg-navy text-white"
                        : "text-grey-500 hover:text-navy",
                    )}
                  >
                    {locale.label}
                  </button>
                ))}
              </div>
              <Button asChild variant="primary" size="sm">
                <Link href="/connexion" onClick={() => setMobileOpen(false)}>
                  Connexion
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
