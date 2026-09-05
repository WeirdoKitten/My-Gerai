import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output mandiri (server Node.js minimal + dependency yang dipakai saja) —
  // dibutuhkan untuk deploy via Docker/Dokploy, lihat Dockerfile.
  output: "standalone",
};

export default nextConfig;
