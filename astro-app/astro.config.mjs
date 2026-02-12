import { defineConfig } from "astro/config";
import astroAws from "@astro-aws/adapter";

export default defineConfig({
  output: "server",
  adapter: astroAws({
    mode: "ssr",
  }),
});
