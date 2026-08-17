import type { NextConfig } from "next";

/**
 * Baseline hardening headers on every response. A Content-Security-Policy is
 * deliberately not set here: it needs per-request nonces (proxy.ts) to work
 * with Next's inline runtime, and a wrong one silently breaks the app.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The interview needs the microphone (same origin only); nothing needs the rest.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=()" },
  // Ignored over plain http (local dev); enforced once the site is served over TLS.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
