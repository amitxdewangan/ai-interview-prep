import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

// Load environment variables from the monorepo root .env
const candidatePaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../.env"),
];

for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    try {
      if (typeof process.loadEnvFile === "function") {
        process.loadEnvFile(envPath);
        break;
      }
    } catch {
      // Continue if error
    }
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repo/shared"],
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
