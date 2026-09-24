export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-09-10',
  // Workaround for Nuxt 3.21.x SPA (`ssr: false`) Vite Node IPC crash in dev
  experimental: {
    viteEnvironmentApi: true,
  },
  devtools: { enabled: false },
  css: ['~/assets/css/main.css', 'maplibre-gl/dist/maplibre-gl.css'],
  app: {
    head: {
      title: '1Gallon',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
        },
        { name: 'theme-color', content: '#0D0D0D' },
        { name: 'description', content: 'Fuel delivered to your door' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: '1Gallon' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'application-name', content: '1Gallon' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/icon-192.png' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE ||
        process.env.API_BASE_URL ||
        'http://localhost:4000',
      mapboxToken: process.env.NUXT_PUBLIC_MAPBOX_TOKEN || '',
    },
  },
})
