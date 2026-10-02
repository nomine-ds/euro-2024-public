import { describe, expect, it } from "vitest";

describe("test environment", () => {
  it("sets the API base environment variable", () => {
    expect(process.env.NEXT_PUBLIC_API_BASE).toBe("http://test.local");
  });
});