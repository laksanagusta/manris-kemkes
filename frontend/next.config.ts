import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
