import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../next.config";

afterEach(() => {
  vi.unstubAllEnvs();
});

async function responseHeaders() {
  return (await nextConfig.headers?.())?.flatMap((rule) => rule.headers) ?? [];
}

describe("Next.js security headers", () => {
  it("sends HSTS only in the Vercel production environment", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    const headers = await responseHeaders();

    expect(headers).toContainEqual({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains; preload",
    });
  });

  it.each(["preview", "development", ""])(
    "omits HSTS when VERCEL_ENV is %s",
    async (environment) => {
      vi.stubEnv("VERCEL_ENV", environment);

      const headers = await responseHeaders();

      expect(
        headers.some((header) => header.key === "Strict-Transport-Security"),
      ).toBe(false);
      expect(headers).toContainEqual({
        key: "X-Frame-Options",
        value: "DENY",
      });
    },
  );
});
