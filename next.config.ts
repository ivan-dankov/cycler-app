import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Increase API route timeout for OCR processing
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Fix Turbopack path resolution for Tesseract.js
    turbopackUseSystemTlsCerts: true,
  },
  // Webpack config for Tesseract.js
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Fix for Tesseract.js worker paths
      config.resolve.alias = {
        ...config.resolve.alias,
      };
      config.externals = [...(config.externals || []), 'canvas', 'sharp'];
    }
    return config;
  },
};

export default nextConfig;
