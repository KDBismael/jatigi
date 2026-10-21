import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/orders/*/document': ['./assets/fonts/NotoSans-Regular.ttf', './node_modules/@img/sharp-libvips-*/lib/**/*'],
    '/api/organization/branding': ['./node_modules/@img/sharp-libvips-*/lib/**/*'],
  },
};

export default nextConfig;
