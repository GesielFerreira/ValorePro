/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        serverComponentsExternalPackages: ['playwright', 'ioredis', 'bullmq'],
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
};

export default nextConfig;
