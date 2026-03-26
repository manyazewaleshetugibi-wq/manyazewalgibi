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
    domains: ["fly.storage.tigris.dev"],
    minimumCacheTTL: 60,
  },
  
  output: process.env.NETLIFY ? 'standalone' : undefined,
  reactStrictMode: true,
  
  // Force Webpack instead of Turbopack
  experimental: {
    turbo: false,
  },
  
  // Webpack configuration to ensure CSS works
  webpack: (config, { isServer }) => {
    // Ensure CSS modules work correctly
    config.module.rules.forEach(rule => {
      if (rule.oneOf) {
        rule.oneOf.forEach(oneOfRule => {
          if (oneOfRule.test && oneOfRule.test.toString().includes('css')) {
            oneOfRule.use = oneOfRule.use || [];
          }
        });
      }
    });
    
    return config;
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ]
      }
    ]
  }
}

module.exports = nextConfig;