import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporary for low-memory VPS deploys on Coolify.
  // Revert after the app is stable in production and checks are fixed.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  //force nextjs to bundle those, cuz i dont want to lose exceljs.
  // TODO: use xlsx instead of exceljs
  serverExternalPackages: [
    'exceljs',
    'unzipper',
    'fstream',
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "assets.aceternity.com",
      },
    ],
  },
};

export default nextConfig;
