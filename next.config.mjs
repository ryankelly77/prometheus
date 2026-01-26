/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable server actions
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

export default nextConfig
