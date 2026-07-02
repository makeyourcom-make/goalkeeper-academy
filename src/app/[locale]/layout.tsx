import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Aldrich } from "next/font/google";
import localFont from "next/font/local";

import "../globals.css";

import { CookieBanner } from "@/components/layout/cookie-banner";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { JsonLd } from "@/components/seo/json-ld";
import { routing } from "@/i18n/routing";
import { siteGraph } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Titles use Aldrich (geometric techno, closest free match to the logo
// lettering); body text uses Darwin Pro Light. We keep the existing CSS
// variable names (--font-anton / --font-inter) so the Tailwind tokens
// (font-anton, font-sans) and every component keep working.
const anton = Aldrich({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const inter = localFont({
  src: "../../fonts/darwin-pro-light.woff2",
  weight: "300",
  variable: "--font-inter",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    applicationName: t("title"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fr: "/fr",
        en: "/en",
        "x-default": "/fr",
      },
    },
    openGraph: {
      type: "website",
      siteName: t("title"),
      title: t("title"),
      description: t("description"),
      url: `/${locale}`,
      locale: locale === "en" ? "en_US" : "fr_CH",
      alternateLocale: locale === "en" ? "fr_CH" : "en_US",
      images: [
        {
          url: "/og/og-thumbnail.png",
          width: 1200,
          height: 630,
          alt: t("title"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/og/og-thumbnail.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
    icons: {
      icon: [
        { url: "/favicons/favicon.ico", sizes: "any" },
        {
          url: "/favicons/favicon-32x32.png",
          type: "image/png",
          sizes: "32x32",
        },
        {
          url: "/favicons/favicon-16x16.png",
          type: "image/png",
          sizes: "16x16",
        },
        {
          url: "/favicons/favicon-512x512.png",
          type: "image/png",
          sizes: "512x512",
        },
      ],
      apple: "/favicons/favicon-180x180.png",
      shortcut: "/favicons/favicon.ico",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  let isAuthed = false;
  let isAdmin = false;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthed = Boolean(user);
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      isAdmin = profile?.role === "admin";
    }
  }

  return (
    <html lang={locale} className={`${anton.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col bg-white font-sans text-grey-700 antialiased">
        <JsonLd data={siteGraph(locale)} />
        <NextIntlClientProvider>
          <Header initialIsAuthed={isAuthed} initialIsAdmin={isAdmin} />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
