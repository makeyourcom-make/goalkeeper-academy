import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { mdxComponents } from "@/components/blog/mdx-components";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getAllPosts, getAllSlugs, getPostBySlug } from "@/lib/blog";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

export function generateStaticParams() {
  return getAllSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const post = getPostBySlug(locale, slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: post.cover }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.cover],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const post = getPostBySlug(locale, slug);
  if (!post) notFound();

  const t = await getTranslations("BlogPage");
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "en" ? "en-GB" : "fr-CH",
    { day: "numeric", month: "long", year: "numeric" },
  );
  const formattedDate = dateFormatter.format(new Date(post.date));

  // prev / next within the locale, sorted desc by date
  const allPosts = getAllPosts(locale);
  const currentIndex = allPosts.findIndex((p) => p.slug === post.slug);
  const newer = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const older =
    currentIndex >= 0 && currentIndex < allPosts.length - 1
      ? allPosts[currentIndex + 1]
      : null;

  return (
    <article>
      {/* Cover */}
      <header className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0">
          <Image
            src={post.cover}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/70 to-navy"
            aria-hidden="true"
          />
        </div>
        <div className="container relative z-10 flex flex-col items-center gap-5 py-20 text-center lg:py-28">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToList")}
          </Link>
          <h1 className="max-w-3xl text-balance font-anton text-h1 uppercase leading-tight text-white">
            {post.title}
          </h1>
          <p className="max-w-2xl text-lg text-white/80">{post.excerpt}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-white/70">
            <time dateTime={post.date}>
              {t("publishedOn", { date: formattedDate })}
            </time>
            <span aria-hidden="true">•</span>
            <span>{t("by", { author: post.author })}</span>
            <span aria-hidden="true">•</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {t("readingTime", { minutes: post.readingTimeMinutes })}
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container max-w-3xl">
          <div className="mdx text-base text-grey-700">
            <MDXRemote source={post.content} components={mdxComponents} />
          </div>

          {post.tags.length > 0 && (
            <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-grey-100 pt-6">
              <span className="text-sm font-semibold text-navy">
                {t("tags")} :
              </span>
              {post.tags.map((tag) => (
                <Badge key={tag} variant="muted">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Prev / next */}
      {(newer || older) && (
        <nav aria-label="post navigation" className="bg-grey-100 py-12">
          <div className="container grid gap-4 md:grid-cols-2">
            {older ? (
              <Link
                href={{
                  pathname: "/blog/[slug]",
                  params: { slug: older.slug },
                }}
                className="group flex flex-col gap-1 rounded-xl border border-grey-300 bg-white p-5 text-left transition-shadow hover:shadow-md"
              >
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-grey-500">
                  <ArrowLeft className="h-3 w-3" />
                  {t("previous")}
                </span>
                <span className="font-anton text-lg uppercase text-navy group-hover:text-orange">
                  {older.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {newer ? (
              <Link
                href={{
                  pathname: "/blog/[slug]",
                  params: { slug: newer.slug },
                }}
                className="group flex flex-col gap-1 rounded-xl border border-grey-300 bg-white p-5 text-right transition-shadow hover:shadow-md md:items-end"
              >
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-grey-500">
                  {t("next")}
                  <ArrowRight className="h-3 w-3" />
                </span>
                <span className="font-anton text-lg uppercase text-navy group-hover:text-orange">
                  {newer.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </div>
        </nav>
      )}
    </article>
  );
}
