import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Ensure consistent font loading
  optimizeFonts: true,
  // Enable static optimization
  trailingSlash: false,
  // Ensure consistent build output
  swcMinify: true,
};

export default nextConfig;
