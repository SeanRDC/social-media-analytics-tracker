import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite ships WebAssembly and data files; load it from node_modules at runtime instead of bundling
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
