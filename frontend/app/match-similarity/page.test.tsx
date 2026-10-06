import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MatchSimilarityPage from "./page";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("match similarity page", () => {
  it("loads match candidates and renders the selected match's results", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([
          {
            match_id: 1,
            home_team: "Germany",
            away_team: "Scotland",
            date: "2024-06-14",
          },
          {
            match_id: 2,
            home_team: "Spain",
            away_team: "Croatia",
            date: "2024-06-15",
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          similar_matches: [
            {
              match_id: 2,
              distance: 0.123,
              stats: {
                total_goals: 3,
                total_shots: 15,
                total_passes: 800,
                total_xg: 2.5,
              },
            },
          ],
        }),
      );

    render(<MatchSimilarityPage />);

    const selector = await screen.findByRole("combobox");
    fireEvent.change(selector, { target: { value: "1" } });

    expect(
      await screen.findByText("Referensi: Germany vs Scotland"),
    ).toBeInTheDocument();
    const similarMatchLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/match/2");
    expect(similarMatchLink).toHaveTextContent("Spain vs Croatia");
    expect(screen.getByText("0.12")).toBeInTheDocument();
    expect(screen.getByText("2.50")).toBeInTheDocument();
    expect(similarMatchLink).toHaveAttribute("href", "/match/2");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://test.local/matches/similar/1?top_n=5",
    );
  });
});
