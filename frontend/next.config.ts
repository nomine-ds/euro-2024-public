import type { NextConfig } from "next";

function getBackendUrl(): URL {
  const value = process.env.BACKEND_INTERNAL_URL;
  if (!value) {
    throw new Error("BACKEND_INTERNAL_URL must be set for the Next.js server.");
  }

  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("BACKEND_INTERNAL_URL must use HTTP or HTTPS.");
  }
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error("BACKEND_INTERNAL_URL must be an origin without credentials or a path.");
  }
  return url;
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    const backendUrl = getBackendUrl();
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.origin}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(process.env.VERCEL_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
