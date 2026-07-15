import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/config";

const nextConfig: NextConfig = {
  basePath: BASE_PATH || undefined,
  skipTrailingSlashRedirect: true,
  async redirects() {
    if (!BASE_PATH) return [];
    return [
      {
        source: "/",
        destination: BASE_PATH,
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
