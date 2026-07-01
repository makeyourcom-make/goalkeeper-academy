import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Last Line — Goalkeeper Academy",
    short_name: "The Last Line",
    description:
      "Académie de gardiens de but du Chablais — formation, stages et coaching pour gardiennes et gardiens, de 10 ans aux seniors.",
    start_url: "/fr",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0B2545",
    lang: "fr",
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
        purpose: "any maskable",
      },
    ],
  };
}
