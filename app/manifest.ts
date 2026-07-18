import type { MetadataRoute } from "next";
import {
  NEXT_PUBLIC_CLINIC_NAME,
  NEXT_PUBLIC_CLINIC_TAGLINE,
  NEXT_PUBLIC_LOGO_URL,
  NEXT_PUBLIC_THEME_COLOR,
  PWA_BACKGROUND_COLOR,
  PWA_START_URL,
  PWA_ICON_192_URL,
  PWA_ICON_512_URL,
} from "@/constants/ClinicDetails";

export default function manifest(): MetadataRoute.Manifest {
  const icons: MetadataRoute.Manifest["icons"] = [
    {
      src: PWA_ICON_192_URL,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: PWA_ICON_512_URL,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: PWA_ICON_512_URL,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];

  if (NEXT_PUBLIC_LOGO_URL) {
    icons.push({
      src: NEXT_PUBLIC_LOGO_URL,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    });
  }

  return {
    id: PWA_START_URL,
    name: `${NEXT_PUBLIC_CLINIC_NAME} — ${NEXT_PUBLIC_CLINIC_TAGLINE}`,
    short_name: NEXT_PUBLIC_CLINIC_NAME,
    description: NEXT_PUBLIC_CLINIC_TAGLINE,
    start_url: PWA_START_URL,
    scope: PWA_START_URL,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: NEXT_PUBLIC_THEME_COLOR,
    categories: ["medical", "health", "productivity"],
    icons,
  };
}
