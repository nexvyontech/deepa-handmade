import type { NextConfig } from "next";

/** Host of the backend API. Inline required; remotePatterns cannot be dynamic at runtime. */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const parsedApiUrl = new URL(apiUrl);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: parsedApiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: parsedApiUrl.hostname,
        port: parsedApiUrl.port || undefined,
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: parsedApiUrl.hostname,
        port: parsedApiUrl.port || undefined,
        pathname: "/**",
      },
    ],
    // Local development uses http://localhost; explicit opt-in per Next 16.
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
