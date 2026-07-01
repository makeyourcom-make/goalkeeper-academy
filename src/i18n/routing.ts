import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/academie": {
      fr: "/academie",
      en: "/academy",
    },
    "/offres": {
      fr: "/offres",
      en: "/offers",
    },
    "/reserver": {
      fr: "/reserver",
      en: "/book",
    },
    "/stages": {
      fr: "/stages",
      en: "/camps",
    },
    "/stages/giana-stop-and-shoot": {
      fr: "/stages/giana-stop-and-shoot",
      en: "/camps/giana-stop-and-shoot",
    },
    "/stages/[slug]": {
      fr: "/stages/[slug]",
      en: "/camps/[slug]",
    },
    "/stages/[slug]/reservation": {
      fr: "/stages/[slug]/reservation",
      en: "/camps/[slug]/booking",
    },
    "/stages/[slug]/reservation/confirmation": {
      fr: "/stages/[slug]/reservation/confirmation",
      en: "/camps/[slug]/booking/confirmation",
    },
    "/blog": {
      fr: "/actualites",
      en: "/news",
    },
    "/blog/[slug]": {
      fr: "/actualites/[slug]",
      en: "/news/[slug]",
    },
    "/contact": "/contact",
    "/connexion": {
      fr: "/connexion",
      en: "/sign-in",
    },
    "/inscription": {
      fr: "/inscription",
      en: "/sign-up",
    },
    "/mot-de-passe-oublie": {
      fr: "/mot-de-passe-oublie",
      en: "/forgot-password",
    },
    "/mot-de-passe-nouveau": {
      fr: "/mot-de-passe-nouveau",
      en: "/reset-password",
    },
    "/mon-compte": {
      fr: "/mon-compte",
      en: "/account",
    },
    "/mon-compte/profil": {
      fr: "/mon-compte/profil",
      en: "/account/profile",
    },
    "/mon-compte/enfants": {
      fr: "/mon-compte/enfants",
      en: "/account/children",
    },
    "/mon-compte/enfants/nouveau": {
      fr: "/mon-compte/enfants/nouveau",
      en: "/account/children/new",
    },
    "/mon-compte/enfants/[id]": {
      fr: "/mon-compte/enfants/[id]",
      en: "/account/children/[id]",
    },
    "/mon-compte/planning": {
      fr: "/mon-compte/planning",
      en: "/account/schedule",
    },
    "/mon-compte/factures": {
      fr: "/mon-compte/factures",
      en: "/account/invoices",
    },
    "/admin": "/admin",
    "/admin/planning": {
      fr: "/admin/planning",
      en: "/admin/schedule",
    },
    "/admin/planning/[id]": {
      fr: "/admin/planning/[id]",
      en: "/admin/schedule/[id]",
    },
    "/admin/entraineurs": {
      fr: "/admin/entraineurs",
      en: "/admin/coaches",
    },
    "/admin/charges": "/admin/charges",
    "/admin/comptabilite": {
      fr: "/admin/comptabilite",
      en: "/admin/accounting",
    },
    "/admin/parents": "/admin/parents",
    "/admin/enfants": {
      fr: "/admin/enfants",
      en: "/admin/children",
    },
    "/admin/factures": {
      fr: "/admin/factures",
      en: "/admin/invoices",
    },
    "/admin/stages": {
      fr: "/admin/stages",
      en: "/admin/camps",
    },
    "/mentions-legales": {
      fr: "/mentions-legales",
      en: "/legal-notice",
    },
    "/cgv": {
      fr: "/cgv",
      en: "/terms",
    },
    "/confidentialite": {
      fr: "/confidentialite",
      en: "/privacy",
    },
    "/cookies": "/cookies",
  },
});

export type Locale = (typeof routing.locales)[number];
