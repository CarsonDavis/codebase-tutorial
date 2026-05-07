import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default config;
