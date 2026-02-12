import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
  test: {
    environment: "nuxt",
    server: {
      deps: {
        inline: ["#imports"],
      },
    },
  },
});
