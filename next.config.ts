import type { NextConfig } from "next";
import path from "node:path";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // The installed Windows SWC native addon is incompatible with this
    // environment; use the version-matched WASM compiler already installed.
    useWasmBinary: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/admin-login", destination: "/login", permanent: false },
      { source: "/admin-dashboard", destination: "/admin/legacy", permanent: false },
    ];
  },
};
export default nextConfig;
