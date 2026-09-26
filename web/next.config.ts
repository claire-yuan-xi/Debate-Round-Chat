import path from "node:path";
import type { NextConfig } from "next";

// The workflow engine lives in ../shared, next to the Studio that also uses it.
const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
