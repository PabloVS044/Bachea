import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bachea",
    short_name: "Bachea",
    description: "Reporta baches en Ciudad de Guatemala y mira los que ya se taparon.",
    lang: "es-GT",
    start_url: "/",
    display: "standalone",
    background_color: "#121a13",
    theme_color: "#121a13",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
