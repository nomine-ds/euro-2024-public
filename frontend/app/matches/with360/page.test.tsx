import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MatchesWith360Page from "./page";
import { fetchMatches } from "@/lib/api";

vi.mock("@/lib/api", () => ({ fetchMatches: vi.fn() }));
vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

const matches = vi.mocked(fetchMatches);

beforeEach(() => {
  matches.mockReset();
});

describe("matches with 360 data page", () => {
  it("lists only known matches with 360 data", async () => {
    matches.mockResolvedValue([
      {
        match_id: 3764440,
        home_team: "Germany",
        away_team: "Scotland",
        date: "2024-06-14",
      },
      {
        match_id: 1,
        home_team: "Spain",
        away_team: "Croatia",
        date: "2024-06-15",
      },
    ]);

    render(await MatchesWith360Page());

    expect(screen.getByText("1 matches have 360 data (player positions).")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Germany.*Scotland/ })).toHaveAttribute(
      "href",
      "/match/3764440",
    );
    expect(screen.queryByRole("link", { name: /Spain.*Croatia/ })).toBeNull();
  });
});
