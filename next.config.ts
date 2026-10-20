import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/orders/*/document': ['./assets/fonts/NotoSans-Regular.ttf'],
  },
};

export default nextConfig;
