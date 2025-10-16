import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for production
  experimental: {
    optimizeCss: true,
  },
  
  // Ensure consistent builds
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Font optimization
  optimizeFonts: true,
  
  // Image optimization
  images: {
    unoptimized: false,
  },
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
