/** @type {import('next').NextConfig} */
const nextConfig = {
  // next lint skips scripts/ unless it is listed; app and components are the
  // directories it checks by default.
  eslint: { dirs: ['app', 'components', 'scripts'] },
  // The DSi lived at /dsi while it was being built. It is / now; old links
  // (and ?view=plain) carry over, the query string comes along on its own.
  async redirects() {
    return [{ source: '/dsi', destination: '/', permanent: true }]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
    ],
  },
}

module.exports = nextConfig
