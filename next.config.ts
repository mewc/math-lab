import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained island app (own bun.lock). Pin Turbopack's root to this dir
  // so it doesn't infer the monorepo root lockfile as the workspace.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
