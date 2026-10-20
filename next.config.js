/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ["ayqhrpuatqxrmsnjbwgs.supabase.co"] },
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

module.exports = nextConfig;
