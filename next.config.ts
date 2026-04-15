import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained output in .next/standalone — required by the
  // multi-stage Dockerfile so only the minimal runtime files are copied.
  output: "standalone",
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
