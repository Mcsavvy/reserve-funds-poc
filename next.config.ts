import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // don't lint on build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // don't check types on build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
