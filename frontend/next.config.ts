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
};

export default nextConfig;
