import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClustersPage from "./page";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("player clusters page", () => {
  it("loads grouped players, shows averages, and reloads for a new cluster count", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        players: [
          {
            player_id: 1,
            player_name: "Player One",
            goals: 4,
            assists: 2,
            xg: 3,
            cluster: 0,
            cluster_label: "Finisher",
          },
          {
            player_id: 2,
            player_name: "Player Two",
            goals: 2,
            assists: 0,
            xg: 1,
            cluster: 0,
            cluster_label: "Finisher",
          },
        ],
      }),
    );

    render(<ClustersPage />);

    expect(await screen.findByText("Finisher")).toBeInTheDocument();
    expect(screen.getByText("Player One")).toBeInTheDocument();
    expect(screen.getByText("3.00")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test.local/players/clustering?n_clusters=4",
    );

    fireEvent.change(screen.getByRole("slider"), {
      target: { value: "5" },
    });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "http://test.local/players/clustering?n_clusters=5",
      ),
    );
  });

  it("shows an API error", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503));

    render(<ClustersPage />);

    expect(await screen.findByText(/HTTP 503/)).toBeInTheDocument();
  });
});
