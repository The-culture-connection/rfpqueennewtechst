import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude functions directory from Next.js build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/functions/**', '**/node_modules/**'],
    };
    
    if (isServer) {
      // Externalize canvas to avoid webpack bundling issues
      config.externals.push('canvas');
      
      // Mark pdf-parse and its dependencies as external for server-side
      config.resolve.alias.canvas = false;
    } else {
      // Client-side: Exclude Node.js modules that can't run in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        'firebase-admin': false,
      };
    }
    return config;
  },
  eslint: {
    // Ignore ESLint errors during builds for now (can be re-enabled later)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during builds (we'll fix them properly)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
