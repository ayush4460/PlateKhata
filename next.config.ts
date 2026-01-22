import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // ✅ Add this to bypass optimization for external domains
    unoptimized: false, // Keep optimization enabled for other domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/',
      },
      {
        protocol: 'https',
        hostname: 'platekhata-api.onrender.com',
        port: '',
        pathname: '/',
      },
      {
        protocol: 'https',
        hostname: 'dhvxnvbbjzmvd.cloudfront.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
        port: '',
        pathname: '/**',
      },
    ],
    // ✅ Add these domains to allow list
    domains: [
      'res.cloudinary.com',
      'dhvxnvbbjzmvd.cloudfront.net',
      'placehold.co',
      'images.unsplash.com',
      'picsum.photos',
    ],
  },
};

export default nextConfig;
