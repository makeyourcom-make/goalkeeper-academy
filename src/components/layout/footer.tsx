import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin } from "lucide-react";

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const COLUMNS = [
  {
    title: "L'académie",
    links: [
      { href: "/academie", label: "Notre mission" },
      { href: "/academie#equipe", label: "L'équipe" },
      { href: "/academie#methode", label: "Notre méthode" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Offres",
    links: [
      { href: "/offres", label: "Formules enfants" },
      { href: "/stages", label: "Stages vacances" },
      { href: "/offres#cours-particuliers", label: "Cours particuliers" },
      { href: "/offres#clubs", label: "Contrat clubs" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/stages/giana-stop-and-shoot", label: "Giana Stop & Shoot" },
      { href: "/connexion", label: "Espace membre" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/cgv", label: "CGV" },
      { href: "/confidentialite", label: "Confidentialité" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="container py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="flex items-center gap-3"
              aria-label="Goalkeeper Academy"
            >
              <Image
                src="/logos/Logo-transparent.png"
                alt="Goalkeeper Academy"
                width={56}
                height={56}
                className="h-14 w-auto"
              />
              <span className="font-anton text-xl uppercase tracking-wide">
                Goalkeeper Academy
              </span>
            </Link>
            <p className="max-w-sm text-sm text-white/70">
              L&apos;académie de gardiens de but du Chablais valaisan. Formation
              spécialisée pour les jeunes gardiens de 6 à 18 ans.
            </p>
            <div className="space-y-1.5 text-sm text-white/70">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange" /> Chablais valaisan,
                Suisse
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-orange" />
                <a
                  href="mailto:contact@goalkeeperacademy.ch"
                  className="hover:text-white"
                >
                  contact@goalkeeperacademy.ch
                </a>
              </p>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h3 className="font-anton text-base uppercase tracking-wide text-white">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/70 transition-colors hover:text-orange"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/60 md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} Goalkeeper Academy — Tous droits
            réservés.
          </p>
          <div className="flex items-center gap-5">
            <a
              href="https://www.instagram.com/"
              aria-label="Instagram"
              target="_blank"
              rel="noreferrer noopener"
              className="text-white/70 transition-colors hover:text-orange"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
            <a
              href="https://www.facebook.com/"
              aria-label="Facebook"
              target="_blank"
              rel="noreferrer noopener"
              className="text-white/70 transition-colors hover:text-orange"
            >
              <FacebookIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
