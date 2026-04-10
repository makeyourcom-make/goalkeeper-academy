import { notFound } from "next/navigation";

import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";

function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const posts = getAllPosts(locale);

  const channelTitle =
    locale === "en" ? "Goalkeeper Academy — Blog" : "Goalkeeper Academy — Blog";
  const channelDescription =
    locale === "en"
      ? "Tips, analysis and behind-the-scenes goalkeeper training stories from Goalkeeper Academy."
      : "Conseils, analyses et coulisses de la formation de gardien de but. Articles signés Goalkeeper Academy.";
  const blogUrl = `${baseUrl}${getPathname({ href: "/blog", locale })}`;

  const items = posts
    .map((post) => {
      const url = `${baseUrl}${getPathname({
        href: { pathname: "/blog/[slug]", params: { slug: post.slug } },
        locale,
      })}`;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
      <author>${escapeXml(post.author)}</author>
${post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${blogUrl}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>${locale}</language>
    <atom:link href="${baseUrl}/${locale}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
