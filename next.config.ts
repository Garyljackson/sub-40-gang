import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dgalywyr863hv.cloudfront.net', // Strava CDN
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net', // Strava CDN variants
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile photos
      },
    ],
  },
};

export default nextConfig;
