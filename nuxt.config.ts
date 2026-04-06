// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss'],
  ssr: false,
  devtools: {
    enabled: true,
  },
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no',
    },
  },
  css: ['primeicons/primeicons.css'],
  future: {
    compatibilityVersion: 4,
  },
  nitro: {
    experimental: {
      tasks: true,
    },
    devTasks: true,
    serverAssets: [
    ],
    scheduledTasks: {
      '*/15 * * * *': ['sync:playlists', 'sync:downloads'],
    },
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
