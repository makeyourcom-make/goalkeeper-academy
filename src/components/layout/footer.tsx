import Image from "next/image";
import { useTranslations } from "next-intl";
import { Mail, MapPin } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { BUSINESS } from "@/lib/seo";

// lucide-react dropped brand glyphs, so the Instagram mark is inlined.
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const COLUMNS = [
  {
    key: "academy",
    links: [
      { href: "/academie", labelKey: "mission" },
      { href: "/academie", labelKey: "team", hash: "#equipe" },
      { href: "/academie", labelKey: "method", hash: "#methode" },
      { href: "/contact", labelKey: "contact" },
    ],
  },
  {
    key: "offers",
    links: [
      { href: "/offres", labelKey: "kids", hash: "#jeunes-saison" },
      { href: "/offres", labelKey: "adults", hash: "#adultes-saison" },
      { href: "/stages", labelKey: "camps" },
      { href: "/offres", labelKey: "clubs", hash: "#adultes-saison" },
    ],
  },
  {
    key: "resources",
    links: [
      { href: "/blog", labelKey: "blog" },
      { href: "/stages/giana-stop-and-shoot", labelKey: "giana" },
      { href: "/connexion", labelKey: "members" },
    ],
  },
  {
    key: "legal",
    links: [
      { href: "/mentions-legales", labelKey: "imprint" },
      { href: "/cgv", labelKey: "terms" },
      { href: "/confidentialite", labelKey: "privacy" },
      { href: "/cookies", labelKey: "cookies" },
    ],
  },
] as const;

export function Footer() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy text-white">
      <div className="container py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-4">
            <Link href="/" aria-label="The Last Line" className="inline-block">
              <Image
                src="/logos/wordmark-white.png"
                alt="The Last Line — Goalkeeper Academy"
                width={1660}
                height={181}
                className="h-8 w-auto max-w-full"
              />
            </Link>
            <p className="max-w-sm text-sm text-white/70">{t("tagline")}</p>
            <div className="space-y-1.5 text-sm text-white/70">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange" /> {t("location")}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-orange" />
                <a href={`mailto:${t("email")}`} className="hover:text-white">
                  {t("email")}
                </a>
              </p>
            </div>
            <a
              href={BUSINESS.instagram.url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Instagram"
              className="inline-flex w-fit items-center gap-2 text-sm text-white/70 transition-colors hover:text-orange"
            >
              <InstagramIcon className="h-5 w-5" />@{BUSINESS.instagram.handle}
            </a>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.key} className="flex flex-col gap-3">
              <h3 className="font-anton text-base uppercase tracking-wide text-white">
                {t(`columns.${col.key}.title`)}
              </h3>
              <ul className="flex flex-col gap-2 text-sm">
                {col.links.map((link) => {
                  const hash = "hash" in link ? link.hash : undefined;
                  return (
                    <li key={`${col.key}-${link.labelKey}`}>
                      <Link
                        href={
                          hash
                            ? { pathname: link.href, hash: hash.slice(1) }
                            : link.href
                        }
                        className="text-white/70 transition-colors hover:text-orange"
                      >
                        {t(`columns.${col.key}.${link.labelKey}`)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/60 md:flex-row md:items-center">
          <p>{t("copyright", { year })}</p>
          <p>
            {t("credit")}{" "}
            <a
              href="https://makeyourcom.ch"
              target="_blank"
              rel="noreferrer noopener"
              className="font-normal text-white/80 transition-colors hover:text-orange"
            >
              @MakeYourCom
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
