import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { Newspaper, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";

function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

export async function HomeBlogPreview() {
  const t = await getTranslations("HomePage.blogPreview");
  const raw = await getLocale();
  const locale: Locale = isLocale(raw) ? raw : routing.defaultLocale;

  // Les trois derniers articles. Le bloc affichait un "à venir" figé dans le
  // code, qui restait là bien après la publication des premiers articles.
  const posts = getAllPosts(locale).slice(0, 3);

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
          <Badge variant="muted">{t("eyebrow")}</Badge>
          <h2 className="font-anton text-h2 uppercase text-navy">
            {t("title")}
          </h2>
        </div>

        {posts.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl border border-grey-100 bg-grey-100 px-8 py-12 text-center">
            <Newspaper className="h-8 w-8 text-orange" aria-hidden="true" />
            <p className="text-lg text-grey-700">{t("comingSoon")}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm transition-shadow hover:shadow-md"
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
                        {dateFmt.format(new Date(post.date))}
                      </time>
                      <span aria-hidden="true">•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readingTimeMinutes} min
                      </span>
                    </div>
                    <h3 className="font-anton text-xl uppercase leading-tight text-navy [text-wrap:balance]">
                      <Link
                        href={{
                          pathname: "/blog/[slug]",
                          params: { slug: post.slug },
                        }}
                        className="hover:text-orange"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <p className="line-clamp-3 text-sm text-grey-700">
                      {post.excerpt}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Button asChild variant="outline">
                <Link href="/blog">{t("viewAll")}</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
