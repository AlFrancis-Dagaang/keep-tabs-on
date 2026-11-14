import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keep tabs on",
    short_name: "Keep tabs on",
    description: "Track your money across every account.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f5",
    theme_color: "#c96442",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
