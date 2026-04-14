import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions are stable in Next.js 15; no flag needed.
  },
  images: {
    remotePatterns: [
      {
        // Placeholder for proof-of-delivery photo uploads
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
