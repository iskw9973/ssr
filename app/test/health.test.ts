import { describe, it, expect } from "vitest";
import { $fetch, setup } from "@nuxt/test-utils/e2e";

describe("Health API", async () => {
  await setup({
    server: true,
  });

  it("returns ok status", async () => {
    const response = await $fetch("/api/health");
    expect(response).toEqual({ status: "ok" });
  });
});
