import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlayersPage from "./page";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("players page", () => {
  it("filters players by name and team and sorts by the selected statistic", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            player_id: 1,
            player_name: "Harry Kane",
            team_name: "England",
            goals: 3,
            assists: 1,
            shots: 5,
            passes: 20,
            xg: 2.5,
            xa: 0.5,
          },
          {
            player_id: 2,
            player_name: "Jude Bellingham",
            team_name: "England",
            goals: 2,
            assists: 2,
            shots: 4,
            passes: 30,
            xg: 1.5,
            xa: 1.2,
          },
          {
            player_id: 3,
            player_name: "Rodri",
            team_name: "Spain",
            goals: 1,
            assists: 3,
            shots: 2,
            passes: 80,
            xg: 0.7,
            xa: 1.8,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<PlayersPage />);

    expect(await screen.findByText("Harry Kane")).toBeInTheDocument();
    expect(screen.getByText("3 players • 2 teams")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Player name..."), {
      target: { value: "jude" },
    });
    expect(screen.getByText("Jude Bellingham")).toBeInTheDocument();
    expect(screen.queryByText("Harry Kane")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Player name..."), {
      target: { value: "" },
    });
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "England" },
    });
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByText("Rodri")).toBeNull();

    fireEvent.change(screen.getAllByRole("combobox")[1], {
      target: { value: "assists" },
    });
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Jude Bellingham");
  });

  it("shows an empty state when no players match", async () => {
    fetchMock.mockResolvedValue(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<PlayersPage />);

    expect(
      await screen.findByText("No players match the current filter."),
    ).toBeInTheDocument();
  });

  it("paginates players with Load 100 more button", async () => {
    const players = Array.from({ length: 150 }, (_, i) => ({
      player_id: i + 1,
      player_name: `Player ${String(i + 1).padStart(3, "0")}`,
      team_name: "Test Team",
      goals: 150 - i,
      assists: 0,
      shots: 10,
      passes: 50,
      xg: 1.0,
      xa: 0.5,
    }));

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(players), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<PlayersPage />);

    // Initially shows first 100, pagination info, and "Load 100 more"
    expect(await screen.findByText("Player 001")).toBeInTheDocument();
    expect(screen.getByText(/Showing 100 of 150 players/)).toBeInTheDocument();

    const loadMore = screen.getByRole("button", { name: /Load 100 more/i });
    expect(loadMore).toBeInTheDocument();

    // Click load more → all 150 shown, button disappears
    fireEvent.click(loadMore);
    expect(screen.getByText(/Showing 150 of 150 players/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Load 100 more/i })).toBeNull();
  });

  it("resets pagination when search filter changes", async () => {
    const players = Array.from({ length: 150 }, (_, i) => ({
      player_id: i + 1,
      player_name: `Player ${String(i + 1).padStart(3, "0")}`,
      team_name: "Test Team",
      goals: 150 - i,
      assists: 0,
      shots: 10,
      passes: 50,
      xg: 1.0,
      xa: 0.5,
    }));

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(players), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<PlayersPage />);

    expect(await screen.findByText("Player 001")).toBeInTheDocument();

    // Load more to reach 150
    fireEvent.click(screen.getByRole("button", { name: /Load 100 more/i }));
    expect(screen.getByText(/Showing 150 of 150 players/)).toBeInTheDocument();

    // Change search → visibleCount resets to 100
    fireEvent.change(screen.getByPlaceholderText("Player name..."), {
      target: { value: "Player" },
    });
    expect(screen.getByText(/Showing 100 of 150 players/)).toBeInTheDocument();
  });
});
