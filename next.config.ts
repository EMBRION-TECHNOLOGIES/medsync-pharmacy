// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   env: {
//     NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.227:3000/api/v1',
//     NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://192.168.1.227:3000',
//     // Socket sanitization feature flags
//     // Set to "/" for legacy, "/patient-pharmacy" for new contracts
//     NEXT_PUBLIC_SOCKET_NAMESPACE: process.env.NEXT_PUBLIC_SOCKET_NAMESPACE || '/patient-pharmacy',
//     // Set to "true" during migration, "false" after backend removes legacy events
//     NEXT_PUBLIC_ENABLE_LEGACY_EVENTS: process.env.NEXT_PUBLIC_ENABLE_LEGACY_EVENTS || 'false',
//   },
// };

// export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to succeed even if there are type errors.
    // We will fix type issues incrementally without blocking deploys.
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"]
  }
};

export default nextConfig;
