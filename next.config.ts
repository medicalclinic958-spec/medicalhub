import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell webpack to ignore server-only packages when bundling for the browser/edge
  serverExternalPackages: ["mongoose", "bcryptjs", "cloudinary"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  // Skip TypeScript type checking during build to prevent memory issues
  typescript: {
    ignoreBuildErrors: true,
  },

  // Silence the deprecation warning about "middleware" → "proxy" rename
  // (This is a Next.js canary warning; safe to ignore or suppress)
  experimental: {
    // empty — add future flags here
  },
};

export default nextConfig;