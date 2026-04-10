import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const POSTS = [
  {
    key: "post1",
    image:
      "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1200&q=80",
  },
  {
    key: "post2",
    image:
      "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200&q=80",
  },
  {
    key: "post3",
    image:
      "https://images.unsplash.com/photo-1493924317585-818d70dc6830?w=1200&q=80",
  },
] as const;

export async function HomeBlogPreview() {
  const t = await getTranslations("HomePage.blogPreview");

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div className="flex flex-col gap-3">
            <Badge variant="muted">{t("eyebrow")}</Badge>
            <h2 className="font-anton text-h2 uppercase text-navy">
              {t("title")}
            </h2>
          </div>
          <Button asChild variant="ghost">
            <Link href="/blog">
              {t("viewAll")} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {POSTS.map(({ key, image }) => (
            <article
              key={key}
              className="group flex flex-col overflow-hidden rounded-xl border border-grey-100 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <Badge variant="orange" className="self-start">
                  {t(`items.${key}.category`)}
                </Badge>
                <h3 className="font-anton text-xl uppercase text-navy">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="flex-1 text-sm text-grey-500">
                  {t(`items.${key}.excerpt`)}
                </p>
                <Link
                  href="/blog"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-orange hover:text-orange-600"
                >
                  {t("cta")} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
