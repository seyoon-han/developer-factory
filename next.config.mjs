/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker (no prerendering of API routes)
  output: 'standalone',
  
  // Enable instrumentation for logging
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Ignore TypeScript errors during Docker build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
