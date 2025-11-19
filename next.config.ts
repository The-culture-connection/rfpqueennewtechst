import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
