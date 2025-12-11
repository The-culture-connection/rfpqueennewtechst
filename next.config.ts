import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignore ESLint errors during builds for now (can be re-enabled later)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during builds (we'll fix them properly)
    ignoreBuildErrors: false,
  },
  /* config options here */
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize canvas to avoid webpack bundling issues
      config.externals.push('canvas');
      
      // Mark pdf-parse and its dependencies as external for server-side
      config.resolve.alias.canvas = false;
    }
    return config;
  },
};

export default nextConfig;
