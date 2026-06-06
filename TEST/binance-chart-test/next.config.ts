import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const supabaseGateway =
      process.env.PROCHARTS_SUPABASE_PROXY_TARGET ?? "http://127.0.0.1:8000";

    return [
      {
        source: "/auth/v1/:path*",
        destination: `${supabaseGateway}/auth/v1/:path*`,
      },
      {
        source: "/rest/v1/:path*",
        destination: `${supabaseGateway}/rest/v1/:path*`,
      },
      {
        source: "/storage/v1/:path*",
        destination: `${supabaseGateway}/storage/v1/:path*`,
      },
      {
        source: "/functions/v1/:path*",
        destination: `${supabaseGateway}/functions/v1/:path*`,
      },
      {
        source: "/realtime/v1/:path*",
        destination: `${supabaseGateway}/realtime/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
