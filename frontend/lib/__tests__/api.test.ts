import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMatches } from "../api";

const fetchMock = vi.fn<typeof fetch>();

describe("fetchMatches", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("requests the matches endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([{ match_id: 1 }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(fetchMatches()).resolves.toEqual([{ match_id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/matches");
  });

  it("throws an error for a non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("boom", { status: 500, statusText: "Internal Server Error" })
    );

    await expect(fetchMatches()).rejects.toThrow(/HTTP 500/);
  });

  it("returns parsed JSON for an ok response", async () => {
    const matches = [{ match_id: 2, home_team: "Spain" }];
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(matches), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(fetchMatches()).resolves.toEqual(matches);
  });
});