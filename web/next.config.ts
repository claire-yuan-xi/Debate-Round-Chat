import path from "node:path";
import type { NextConfig } from "next";

// The workflow engine lives in ../shared, next to the Studio that also uses it.
const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
  // Links people saved before chats and groups had these names.
  async redirects() {
    return [
      { source: "/rounds/new", destination: "/new", permanent: true },
      { source: "/rounds/:id", destination: "/chats/:id", permanent: true },
      { source: "/teams/new", destination: "/groups/new", permanent: true },
    ];
  },
};

export default nextConfig;
