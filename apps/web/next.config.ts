import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kompilasi paket workspace TypeScript (mis. @akalink/db).
  transpilePackages: ["@akalink/db"],
  // Biarkan driver "postgres" dimuat dari node_modules saat runtime (jangan di-bundle).
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
