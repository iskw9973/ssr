import { describe, it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import IndexPage from "../pages/index.vue";
import AboutPage from "../pages/about.vue";

describe("Index Page", () => {
  it("renders the heading", async () => {
    const component = await mountSuspended(IndexPage);
    expect(component.find("h1").text()).toContain("SSR Corporate Site");
  });
});

describe("About Page", () => {
  it("renders the heading", async () => {
    const component = await mountSuspended(AboutPage);
    expect(component.find("h1").text()).toContain("About");
  });
});
