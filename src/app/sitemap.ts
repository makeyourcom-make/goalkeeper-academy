import type { MetadataRoute } from "next";

import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";

const PUBLIC_PATHS = [
  "/",
  "/academie",
  "/offres",
  "/stages",
  "/stages/giana-stop-and-shoot",
  "/blog",
  "/contact",
  "/mentions-legales",
  "/cgv",
  "/confidentialite",
  "/cookies",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_PATHS.map((href) => {
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [
        locale,
        `${baseUrl}${getPathname({ href, locale })}`,
      ]),
    );

    return {
      url: `${baseUrl}${getPathname({ href, locale: routing.defaultLocale })}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: href === "/" ? 1 : 0.7,
      alternates: { languages },
    };
  });

  const blogEntries: MetadataRoute.Sitemap = routing.locales.flatMap(
    (locale: Locale) =>
      getAllPosts(locale).map((post) => ({
        url: `${baseUrl}${getPathname({
          href: { pathname: "/blog/[slug]", params: { slug: post.slug } },
          locale,
        })}`,
        lastModified: new Date(post.date),
        changeFrequency: "yearly" as const,
        priority: 0.6,
      })),
  );

  return [...staticEntries, ...blogEntries];
}
