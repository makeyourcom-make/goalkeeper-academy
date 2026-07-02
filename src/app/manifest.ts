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
    // Navy so the launch/splash screen blends with the navy app icon (the full
    // logo on navy) for a seamless branded start.
    background_color: "#0B2545",
    theme_color: "#0B2545",
    lang: "fr",
    categories: ["sports", "education"],
    icons: [
      {
        src: "/icons/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
