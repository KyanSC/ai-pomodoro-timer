/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack by default to prevent caching issues
  experimental: {
    // Remove deprecated turbo config
  },
  // Add better error handling and cache management
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Improve build stability
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable webpack cache in development to prevent corruption
      config.cache = false;
      // Add better error handling
      config.stats = 'errors-warnings';
    }
    return config;
  },
  // Add better error recovery
  typescript: {
    // Don't fail build on type errors in dev
    ignoreBuildErrors: false,
  },
  eslint: {
    // Don't fail build on lint errors in dev
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
