/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fly.storage.tigris.dev",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // ADD THIS WEBPACK CONFIGURATION
  webpack: (config) => {
    // Alias 'xlsx' to 'sheetjs' so imports work without code changes
    config.resolve.alias['xlsx'] = 'sheetjs';
    return config;
  }
}

module.exports = nextConfig;