/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        pathname: '**',
      },
    ],
  },
  output: 'standalone',
  reactStrictMode: true,
};

export default nextConfig;
