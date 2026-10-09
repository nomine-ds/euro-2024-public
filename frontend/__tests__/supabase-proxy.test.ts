import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/[...path]/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Supabase API proxy", () => {
  it("forwards API requests with the public key and query string", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json([{ match_id: 42 }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("https://app.example/api/matches?limit=10"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ match_id: 42 }]);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://project.supabase.co/functions/v1/api/matches?limit=10"),
      {
        method: "GET",
        headers: {
          apikey: "sb_publishable_test",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );
  });

  it("reports missing Supabase settings without making a request", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new Request("https://app.example/api/matches"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      message: "Supabase environment variables are not configured.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});