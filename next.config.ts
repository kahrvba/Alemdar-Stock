import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  //force nextjs to bundle those, cuz i dont want to lose exceljs.
  // TODO: use xlsx instead of exceljs
  serverExternalPackages: [
    'exceljs',
    'unzipper',
    'fstream',
    'rimraf',
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
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
