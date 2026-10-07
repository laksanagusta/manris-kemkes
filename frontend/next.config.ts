import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/panduan", destination: "/docs/introduction", permanent: true },
      { source: "/panduan/risiko", destination: "/docs/introduction", permanent: true },
      { source: "/panduan-risiko", destination: "/docs/introduction", permanent: true },
      { source: "/panduan/pengenalan", destination: "/docs/introduction", permanent: true },
      { source: "/panduan/akses-akun", destination: "/docs/account-access", permanent: true },
      { source: "/panduan/piagam-manris", destination: "/docs/risk-charter", permanent: true },
      { source: "/panduan/eskalasi-risiko", destination: "/docs/risk-escalation", permanent: true },
      { source: "/panduan/register-risiko", destination: "/docs/risk-register", permanent: true },
      { source: "/panduan/penanganan", destination: "/docs/risk-treatment", permanent: true },
      { source: "/panduan/pemantauan", destination: "/docs/risk-monitoring", permanent: true },
      { source: "/panduan/kejadian-risiko", destination: "/docs/risk-events", permanent: true },
      { source: "/panduan/kertas-kerja", destination: "/docs/working-papers", permanent: true },
      { source: "/panduan/tanda-tangan", destination: "/docs/signatures", permanent: true },
      { source: "/panduan/laporan", destination: "/docs/reports", permanent: true },
      { source: "/panduan/istilah-dan-kendala", destination: "/docs/glossary-and-troubleshooting", permanent: true },
      { source: "/panduan/mom", destination: "/docs/meeting-minutes", permanent: true },
      { source: "/panduan/dashboard", destination: "/docs/dashboard", permanent: true },
      { source: "/panduan/:slug", destination: "/docs/:slug", permanent: true },
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
