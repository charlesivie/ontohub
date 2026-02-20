import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  // Proxy auth routes to the Express backend so the browser never
  // needs to know the backend origin.
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${API_ORIGIN}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
