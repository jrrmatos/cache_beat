import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss'],
  ssr: false,
  devtools: {
    enabled: true,
  },
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no',
      title: 'Cache Beat',
      meta: [
        { name: 'theme-color', content: '#059669' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'apple-touch-icon', href: '/icons/icon-192.svg' },
      ],
    },
  },
  css: ['primeicons/primeicons.css'],
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-07-15',
  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      '*/15 * * * *': ['sync:playlists', 'sync:downloads'],
    },
    serverAssets: [
      { baseName: 'public', dir: fileURLToPath(new URL('./public', import.meta.url)) },
    ],
  },
  vite: {
    server: {
      allowedHosts: true,
    },
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
