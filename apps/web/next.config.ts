import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Output mandiri (standalone): hasil build berisi server.js + node_modules
  // minimal, ringan dijalankan di VM 1 GB (tanpa `next start`/`pnpm install`).
  output: "standalone",
  // Monorepo: telusuri dependensi dari root repo (2 tingkat di atas apps/web).
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Kompilasi paket workspace TypeScript (mis. @akalink/db).
  transpilePackages: ["@akalink/db"],
  // Biarkan driver "postgres" dimuat dari node_modules saat runtime (jangan di-bundle).
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
