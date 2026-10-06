import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  exportCSV,
  fetch360Data,
  fetchGhostData,
  fetchMatchEvents,
  fetchMatches,
  fetchMatchSimilarity,
  fetchMatchSummary,
  fetchPassNetwork,
  fetchPlayerClusters,
  fetchPlayers,
  fetchPlayersBulk,
  fetchPlayerSummary,
} from "../api";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("API requests", () => {
  it.each([
    ["matches", () => fetchMatches(), "/matches"],
    ["match summary", () => fetchMatchSummary(42), "/match/42/summary"],
    ["match events", () => fetchMatchEvents(42), "/events/42"],
    [
      "match events by type",
      () => fetchMatchEvents(42, "Shot"),
      "/events/42?event_type=Shot",
    ],
    [
      "match similarity",
      () => fetchMatchSimilarity(42, 3),
      "/matches/similar/42?top_n=3",
    ],
    ["360 data", () => fetch360Data("event-id"), "/360/event-id"],
    [
      "360 data for a match",
      () => fetch360Data("event-id", 42),
      "/360/event-id?match_id=42",
    ],
    ["ghost data", () => fetchGhostData("42"), "/ghost/42"],
    ["players", () => fetchPlayers(), "/players"],
    [
      "filtered players",
      () => fetchPlayers(42, 7),
      "/players?match_id=42&team_id=7",
    ],
    ["bulk players", () => fetchPlayersBulk(), "/players/bulk"],
    [
      "bulk players for a match",
      () => fetchPlayersBulk(42),
      "/players/bulk?match_id=42",
    ],
    [
      "player summary",
      () => fetchPlayerSummary(17),
      "/player/17/summary",
    ],
    [
      "player clusters",
      () => fetchPlayerClusters(6),
      "/players/clustering?n_clusters=6",
    ],
    [
      "pass network",
      () => fetchPassNetwork(42),
      "/passnetwork/42",
    ],
    [
      "pass network by team",
      () => fetchPassNetwork(42, 7),
      "/passnetwork/42?team_id=7",
    ],
  ])("requests %s from the expected endpoint", async (_name, request, path) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(request()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`http://test.local${path}`);
  });

  it("throws an error for a non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("boom", { status: 500, statusText: "Internal Server Error" }),
    );

    await expect(fetchMatches()).rejects.toThrow(/HTTP 500/);
  });

  it("returns parsed JSON for an ok response", async () => {
    const matches = [{ match_id: 2, home_team: "Spain" }];
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(matches), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fetchMatches()).resolves.toEqual(matches);
  });

  it("uses the backend origin for server-side API routes", async () => {
    vi.stubGlobal("window", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_BASE", "/api");
    vi.stubEnv("BACKEND_INTERNAL_URL", "https://backend.test/prefix");
    vi.resetModules();
    const { fetchMatches: fetchServerMatches } = await import("../api");
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await expect(fetchServerMatches()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("https://backend.test/matches");
  });

  it("requires the backend origin for server-side API routes", async () => {
    vi.stubGlobal("window", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_BASE", "/api");
    vi.stubEnv("BACKEND_INTERNAL_URL", "");
    vi.resetModules();
    const { fetchMatches: fetchServerMatches } = await import("../api");

    await expect(fetchServerMatches()).rejects.toThrow(
      "BACKEND_INTERNAL_URL must be set for server-side API requests.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("downloads a CSV and releases its object URL", async () => {
    const createObjectURL = vi.fn(() => "blob:test-export");
    const revokeObjectURL = vi.fn();
    const originalCreateObjectURL = Object.getOwnPropertyDescriptor(
      window.URL,
      "createObjectURL",
    );
    const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(
      window.URL,
      "revokeObjectURL",
    );
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(new Response("csv", { status: 200 }));

    try {
      await exportCSV("players", 42, 17);
    } finally {
      if (originalCreateObjectURL) {
        Object.defineProperty(
          window.URL,
          "createObjectURL",
          originalCreateObjectURL,
        );
      } else {
        delete (window.URL as Partial<typeof URL>).createObjectURL;
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(
          window.URL,
          "revokeObjectURL",
          originalRevokeObjectURL,
        );
      } else {
        delete (window.URL as Partial<typeof URL>).revokeObjectURL;
      }
    }

    expect(fetchMock).toHaveBeenCalledWith(
      "http://test.local/export/csv?export_type=players&match_id=42&player_id=17",
    );
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-export");
  });

  it("reports the response body when CSV export fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("export failed", { status: 500 }),
    );

    await expect(exportCSV("players")).rejects.toThrow(
      "HTTP 500: export failed",
    );
  });
});