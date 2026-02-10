/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@bites-rms/api",
    "@bites-rms/db",
    "@bites-rms/types",
    "@bites-rms/ui",
    "@bites-rms/utils",
  ],
};

module.exports = nextConfig;
