import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";

const PAGE_SIZE = 6;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BlogPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      types: {
        "application/rss+xml": `/${locale}/rss.xml`,
      },
    },
  };
}

function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

export default async function BlogIndexPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const { page: pageParam } = await searchParams;
  const t = await getTranslations("BlogPage");
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "en" ? "en-GB" : "fr-CH",
    { day: "numeric", month: "long", year: "numeric" },
  );

  const allPosts = getAllPosts(locale);
  const totalPages = Math.max(1, Math.ceil(allPosts.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const posts = allPosts.slice(start, start + PAGE_SIZE);

  return (
    <>
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col items-center gap-5 py-20 text-center lg:py-24">
          <Badge variant="orange">{t("hero.eyebrow")}</Badge>
          <h1 className="max-w-3xl text-balance font-anton text-h1 uppercase leading-tight text-navy">
            {t("hero.title")}
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="container">
          {posts.length === 0 ? (
            <p className="text-center text-grey-500">{t("empty")}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="group flex flex-col overflow-hidden rounded-xl border border-grey-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <Link
                    href={{
                      pathname: "/blog/[slug]",
                      params: { slug: post.slug },
                    }}
                    className="relative block aspect-[16/10] overflow-hidden"
                  >
                    <Image
                      src={post.cover}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-grey-500">
                      <time dateTime={post.date}>
                        {dateFormatter.format(new Date(post.date))}
                      </time>
                      <span aria-hidden="true">•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t("readingTime", {
                          minutes: post.readingTimeMinutes,
                        })}
                      </span>
                    </div>
                    <h2 className="font-anton text-xl uppercase leading-tight text-navy [text-wrap:balance]">
                      <Link
                        href={{
                          pathname: "/blog/[slug]",
                          params: { slug: post.slug },
                        }}
                        className="hover:text-orange"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <p className="flex-1 text-justify text-sm text-grey-700">
                      {post.excerpt}
                    </p>
                    <Link
                      href={{
                        pathname: "/blog/[slug]",
                        params: { slug: post.slug },
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-orange hover:text-orange-600"
                    >
                      {t("readMore")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="pagination"
              className="mt-12 flex items-center justify-center gap-4"
            >
              {currentPage > 1 ? (
                <Link
                  href={{
                    pathname: "/blog",
                    query:
                      currentPage - 1 === 1
                        ? undefined
                        : { page: String(currentPage - 1) },
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-grey-300 px-4 py-2 text-sm font-medium text-navy hover:border-orange hover:text-orange"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("previous")}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg border border-grey-100 px-4 py-2 text-sm font-medium text-grey-300">
                  <ArrowLeft className="h-4 w-4" />
                  {t("previous")}
                </span>
              )}
              <span className="text-sm text-grey-500">
                {t("page", { current: currentPage, total: totalPages })}
              </span>
              {currentPage < totalPages ? (
                <Link
                  href={{
                    pathname: "/blog",
                    query: { page: String(currentPage + 1) },
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-grey-300 px-4 py-2 text-sm font-medium text-navy hover:border-orange hover:text-orange"
                >
                  {t("next")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg border border-grey-100 px-4 py-2 text-sm font-medium text-grey-300">
                  {t("next")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
