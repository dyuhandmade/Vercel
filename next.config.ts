import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  // START_DYU.bat opens this loopback host; its client scripts and HMR must be allowed.
  allowedDevOrigins: ['127.0.0.1'],
  images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.shopify.com' }] },
  async headers() { return [{ source: '/(.*)', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'X-Frame-Options', value: 'DENY' }] }]; },
};
export default config;
