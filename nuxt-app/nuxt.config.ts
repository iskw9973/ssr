export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },
  modules: ["@nuxt/eslint"],
  ssr: true,
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: "SSR Corporate Site",
      meta: [
        {
          name: "description",
          content: "SSR Corporate Site built with Nuxt 3",
        },
      ],
    },
  },
  nitro: {
    preset: "node-server",
  },
  vite: {
    server: {
      watch: {
        ignored: ["**/.jj/**"],
      },
    },
  },
});
