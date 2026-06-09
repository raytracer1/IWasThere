import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.104"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hotinsert-api.zhengbijun123.workers.dev",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google user avatars
      },
    ],
  },
};

export default nextConfig;
