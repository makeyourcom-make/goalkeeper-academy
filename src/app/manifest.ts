import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "The Last Line — Goalkeeper Academy",
    short_name: "The Last Line",
    description:
      "Académie de gardiens de but du Chablais — formation, stages et coaching pour gardiennes et gardiens, de 10 ans aux seniors.",
    start_url: "/fr?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0B2545",
    lang: "fr",
    categories: ["sports", "education"],
    icons: [
      {
        src: "/favicons/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicons/favicon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Android adaptive icon. If the crest looks cropped in the launcher, we
      // can swap in a padded 512 asset later.
      {
        src: "/favicons/favicon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
