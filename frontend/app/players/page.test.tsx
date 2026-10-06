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
});
