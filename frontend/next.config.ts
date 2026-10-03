import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: '/risk/assessment',
        destination: '/risk/register',
        permanent: true,
      },
    ];
  },
  async headers() {
    // Dev-only: Turbopack keeps stable chunk URLs, so force browsers to
    // refetch compiled assets instead of serving stale cached CSS/JS.
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
