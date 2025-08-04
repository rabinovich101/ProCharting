import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@procharting/core', '@procharting/types', '@procharting/webgl'],
  webpack: (config) => {
    // Handle symlinks properly
    config.resolve.symlinks = true;
    return config;
  },
};

export default nextConfig;