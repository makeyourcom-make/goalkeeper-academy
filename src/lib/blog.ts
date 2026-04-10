import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import readingTime from "reading-time";

import { routing, type Locale } from "@/i18n/routing";

export type BlogFrontmatter = {
  title: string;
  excerpt: string;
  date: string;
  author: string;
  cover: string;
  tags: string[];
};

export type BlogPost = BlogFrontmatter & {
  slug: string;
  locale: Locale;
  content: string;
  readingTimeMinutes: number;
};

export type BlogPostMeta = Omit<BlogPost, "content">;

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

function localeDir(locale: Locale): string {
  return path.join(CONTENT_DIR, locale);
}

function readMdxFile(filePath: string, locale: Locale, slug: string): BlogPost {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const fm = data as BlogFrontmatter;
  return {
    ...fm,
    tags: fm.tags ?? [],
    slug,
    locale,
    content,
    readingTimeMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
  };
}

export function getAllPosts(locale: Locale): BlogPostMeta[] {
  const dir = localeDir(locale);
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"));

  const posts = files.map((file) => {
    const slug = file.replace(/\.mdx?$/, "");
    const post = readMdxFile(path.join(dir, file), locale, slug);
    const { content: _content, ...meta } = post;
    void _content;
    return meta;
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(locale: Locale, slug: string): BlogPost | null {
  const file = path.join(localeDir(locale), `${slug}.mdx`);
  if (!fs.existsSync(file)) {
    // fallback to default locale so a missing translation still resolves
    if (locale !== routing.defaultLocale) {
      const fallback = path.join(
        localeDir(routing.defaultLocale),
        `${slug}.mdx`,
      );
      if (fs.existsSync(fallback)) {
        return readMdxFile(fallback, routing.defaultLocale, slug);
      }
    }
    return null;
  }
  return readMdxFile(file, locale, slug);
}

export function getAllSlugs(): { locale: Locale; slug: string }[] {
  return routing.locales.flatMap((locale) =>
    getAllPosts(locale).map(({ slug }) => ({ locale, slug })),
  );
}
