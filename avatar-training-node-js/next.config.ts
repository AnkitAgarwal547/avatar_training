import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['nodejs-whisper', 'kokoro-js'],
};

export default nextConfig;
