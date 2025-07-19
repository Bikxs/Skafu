import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable client-side rendering for real-time capabilities
  experimental: {
    // App directory is enabled by default in Next.js 15
  },
  // Configure for AWS Amplify Hosting with static export
  trailingSlash: true,
  // Enable source maps for debugging
  productionBrowserSourceMaps: true,
  // Optimize for SPA behavior
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  // Configure webpack for client-side rendering
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle Node.js modules in client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Configure environment variables for different environments
  env: {
    NEXT_PUBLIC_API_ENDPOINT: process.env.NEXT_PUBLIC_API_ENDPOINT || 'https://py4fmhlulk.execute-api.eu-west-2.amazonaws.com/development',
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'eu-west-2_PayvQ7I3A',
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1j5b7q457tjv1042imbpfd0pk3',
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-2',
  },
  // Optimize images for Cloudscape components
  images: {
    unoptimized: true, // For static export compatibility
  },
};

export default nextConfig;
