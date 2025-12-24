import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization configuration
  images: {
    // Use modern image formats for better performance
    formats: ["image/webp", "image/avif"],
    // Define responsive image sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimized images for 1 year (31536000 seconds)
    minimumCacheTTL: 31536000,
    // Allow SVG images with security policy
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Compiler options for optimization
  compiler: {
    // Remove console logs in production for cleaner output and smaller bundles
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Enable React strict mode for better development experience and future compatibility
  reactStrictMode: true,

  // Hide dev indicators in the bottom corner
  // In Next.js 16+, setting to false disables all dev indicators
  devIndicators: false,

  // Disable source maps in production for smaller bundle sizes and faster builds
  productionBrowserSourceMaps: false,

  // Experimental features for better performance
  experimental: {
    // Enable optimized CSS loading for better performance
    optimizeCss: true,
  },

  // Turbopack configuration
  turbopack: {
    // Set root to frontend directory to avoid multiple lockfile warnings
    // (monorepo has root package.json for Playwright E2E testing)
    root: __dirname,
  },
};

export default nextConfig;
