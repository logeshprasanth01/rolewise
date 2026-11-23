import type { NextConfig } from "next";

const CANONICAL_HOST = "rolewise-dash.vercel.app";

const nextConfig: NextConfig = {
  compiler: {
    // Keep the browser console clean for users; errors still surface for debugging.
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  async redirects() {
    // Vercel also serves production on team-scoped aliases (e.g. rolewise-loki-5dab.vercel.app).
    // Send anyone who lands there — including OAuth callbacks — to the one public address,
    // keeping the path and query (?code=…) so sign-in still completes.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "rolewise-(?:git-main-)?loki-5dab\\.vercel\\.app" }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
