/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        serverComponentsExternalPackages: [
            'playwright',
            'playwright-extra',
            'puppeteer-extra-plugin-stealth',
            'puppeteer-extra',
            'clone-deep',
            'ioredis',
            'bullmq',
        ],
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
        ],
    },
    headers: async () => [
        {
            source: '/manifest.json',
            headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
        },
    ],
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                encoding: false,
            };
        }
        return config;
    },
};

export default nextConfig;
