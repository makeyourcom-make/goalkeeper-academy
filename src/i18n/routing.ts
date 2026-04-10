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
    "/stages": {
      fr: "/stages",
      en: "/camps",
    },
    "/stages/giana-stop-and-shoot": {
      fr: "/stages/giana-stop-and-shoot",
      en: "/camps/giana-stop-and-shoot",
    },
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/contact": "/contact",
    "/connexion": {
      fr: "/connexion",
      en: "/sign-in",
    },
    "/inscription": {
      fr: "/inscription",
      en: "/sign-up",
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
