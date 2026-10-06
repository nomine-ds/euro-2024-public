import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SearchPage from "./page";
import { fetchMatches, fetchPlayers } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  fetchMatches: vi.fn(),
  fetchPlayers: vi.fn(),
}));
vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

const matches = vi.mocked(fetchMatches);
const players = vi.mocked(fetchPlayers);

beforeEach(() => {
  matches.mockReset();
  players.mockReset();
});

describe("search page", () => {
  it("shows guidance and skips requests for an empty query", async () => {
    render(
      await SearchPage({ searchParams: Promise.resolve({ q: "  " }) }),
    );

    expect(
      screen.getByText("Enter a keyword to search matches or players."),
    ).toBeInTheDocument();
    expect(matches).not.toHaveBeenCalled();
    expect(players).not.toHaveBeenCalled();
  });

  it("renders matching teams and players from a normalized query", async () => {
    matches.mockResolvedValue([
      {
        match_id: 1,
        home_team: "Spain",
        away_team: "Croatia",
        date: "2024-06-15",
      },
    ]);
    players.mockResolvedValue([
      { player_id: 10, player_name: "Spain Player", team_name: "Spain" },
    ]);

    render(
      await SearchPage({ searchParams: Promise.resolve({ q: " SPAIN " }) }),
    );

    expect(screen.getByText(/Search results for: "spain"/)).toBeInTheDocument();
    expect(screen.getByText("2 results found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Spain.*Croatia/ })).toHaveAttribute(
      "href",
      "/match/1",
    );
    const playerLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/player/10");
    expect(playerLink).toHaveTextContent("Spain Player");
  });

  it("shows the empty result state", async () => {
    matches.mockResolvedValue([]);
    players.mockResolvedValue([]);

    render(
      await SearchPage({ searchParams: Promise.resolve({ q: "unknown" }) }),
    );

    expect(
      screen.getByText('No results found for "unknown".'),
    ).toBeInTheDocument();
  });

  it("limits player results to twenty and reports the total", async () => {
    matches.mockResolvedValue([]);
    players.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({
        player_id: index + 1,
        player_name: `Player ${index + 1}`,
      })),
    );

    render(
      await SearchPage({ searchParams: Promise.resolve({ q: "player" }) }),
    );

    expect(screen.getByText("Showing 20 of 21 players.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Player \d+/ })).toHaveLength(20);
  });
});
