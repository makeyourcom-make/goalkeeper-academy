// Central SEO constants + JSON-LD (schema.org) builders for The Last Line.
// The structured data powers local SEO (Google Business / maps), rich results
// and AI search engines.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://thelastline.ch";

export const BUSINESS = {
  name: "The Last Line — Goalkeeper Academy",
  legalName: "Association The Last Line",
  slogan: "L'académie de gardiens de but du Chablais",
  url: SITE_URL,
  email: "contact@thelastline.ch",
  telephone: "+41787042916",
  logo: `${SITE_URL}/favicons/favicon-512x512.png`,
  image: `${SITE_URL}/og/og-thumbnail.png`,
  founders: ["Gianluca Giannarelli", "Arthur Chazelle"],
  geo: { latitude: 46.319178, longitude: 6.935711 },
  address: {
    streetAddress: "Terrain de la Mêlée",
    postalCode: "1860",
    addressLocality: "Aigle",
    addressRegion: "Vaud",
    addressCountry: "CH",
  },
  areaServed: [
    "Chablais",
    "Aigle",
    "Canton de Vaud",
    "Valais",
    "Suisse romande",
  ],
  // Social profiles (sameAs). Instagram to be added once the handle is live.
  sameAs: [] as string[],
} as const;

type Json = Record<string, unknown>;

/** Global site graph: Organization + SportsActivityLocation + WebSite. */
export function siteGraph(locale: string): Json {
  const org: Json = {
    "@type": ["Organization", "SportsOrganization"],
    "@id": `${SITE_URL}/#organization`,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: SITE_URL,
    logo: BUSINESS.logo,
    image: BUSINESS.image,
    email: BUSINESS.email,
    telephone: BUSINESS.telephone,
    founder: BUSINESS.founders.map((name) => ({ "@type": "Person", name })),
    ...(BUSINESS.sameAs.length ? { sameAs: BUSINESS.sameAs } : {}),
  };

  const place: Json = {
    "@type": "SportsActivityLocation",
    "@id": `${SITE_URL}/#academy`,
    name: BUSINESS.name,
    description: BUSINESS.slogan,
    url: SITE_URL,
    logo: BUSINESS.logo,
    image: BUSINESS.image,
    email: BUSINESS.email,
    telephone: BUSINESS.telephone,
    priceRange: "CHF",
    sport: ["Football", "Gardien de but"],
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
    address: { "@type": "PostalAddress", ...BUSINESS.address },
    geo: { "@type": "GeoCoordinates", ...BUSINESS.geo },
    areaServed: BUSINESS.areaServed.map((name) => ({ "@type": "Place", name })),
    ...(BUSINESS.sameAs.length ? { sameAs: BUSINESS.sameAs } : {}),
  };

  const website: Json = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BUSINESS.name,
    inLanguage: locale === "en" ? "en" : "fr",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  return { "@context": "https://schema.org", "@graph": [org, place, website] };
}

/** BreadcrumbList for a page. items: [{name, url}] (url relative or absolute). */
export function breadcrumbGraph(items: { name: string; url: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
    })),
  };
}

/** FAQPage from a list of question/answer pairs. */
export function faqGraph(qas: { question: string; answer: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qas.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: qa.answer },
    })),
  };
}

/** Article schema for a blog/news post. */
export function articleGraph(post: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  locale: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    inLanguage: post.locale === "en" ? "en" : "fr",
    datePublished: post.datePublished,
    dateModified: post.datePublished,
    image: post.image ?? BUSINESS.image,
    mainEntityOfPage: post.url.startsWith("http")
      ? post.url
      : `${SITE_URL}${post.url}`,
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}
