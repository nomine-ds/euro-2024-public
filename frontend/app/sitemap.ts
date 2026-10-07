// frontend/app/sitemap.ts
import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://euro-2024-public-frontend.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: "daily" | "weekly" | "monthly";
  }> = [
    { path: "", priority: 1.0, changeFrequency: "weekly" },
    { path: "/matches/with360", priority: 0.9, changeFrequency: "weekly" },
    { path: "/players", priority: 0.9, changeFrequency: "weekly" },
    { path: "/player-comparison", priority: 0.8, changeFrequency: "monthly" },
    { path: "/match-similarity", priority: 0.7, changeFrequency: "monthly" },
    { path: "/clusters", priority: 0.7, changeFrequency: "monthly" },
    { path: "/counterfactual", priority: 0.6, changeFrequency: "monthly" },
    { path: "/bot", priority: 0.6, changeFrequency: "monthly" },
    { path: "/lab", priority: 0.5, changeFrequency: "monthly" },
  ];

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}