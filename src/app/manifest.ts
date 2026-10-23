import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Counsel · Gestión legal",
    short_name: "Counsel",
    description: "Casos, plazos, escritos y cobros de tu despacho.",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    background_color: "#f6f5f4",
    theme_color: "#f6f5f4",
    lang: "es-BO",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
