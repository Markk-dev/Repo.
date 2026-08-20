import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'repo.a.pinggy.link',
    '*.a.pinggy.link',
    '*.pinggy.link',
    '*.run.pinggy-free.link',
    '*.pinggy-free.link',
    '*.pinggy.io',
    '*.ngrok-free.app',
    '*.ngrok.app',
    '*.ngrok.io',
    '*.loca.lt',
    '*.trycloudflare.com',
    '*.untun.io',
  ],
};

export default nextConfig;
