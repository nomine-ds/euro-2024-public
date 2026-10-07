import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ComparePage from "./page";

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

const teamsPayload = [
  { team_id: 768, team_name: "England" },
  { team_id: 770, team_name: "Germany" },
  { team_id: 772, team_name: "Spain" },
];

const comparePayload = {
  team_a: {
    team_id: 768,
    goals: 13,
    shots: 81,
    passes: 4535,
    xG: 10.49,
    tackles: 192,
    interceptions: 38,
    clearances: 97,
  },
  team_b: {
    team_id: 770,
    goals: 11,
    shots: 95,
    passes: 3401,
    xG: 8.73,
    tackles: 137,
    interceptions: 37,
    clearances: 69,
  },
};

describe("compare page", () => {
  it("loads teams and renders comparison metrics", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(teamsPayload))
      .mockResolvedValueOnce(jsonResponse(comparePayload));

    render(<ComparePage />);

    // Wait for teams dropdown to load
    const comboboxes = await screen.findAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);

    // Select England and Germany
    fireEvent.change(comboboxes[0], { target: { value: "768" } });
    fireEvent.change(comboboxes[1], { target: { value: "770" } });

    // Wait for comparison to render — Team Comparison heading present
    await waitFor(() => {
      expect(
        screen.getByText(/Team Comparison/i),
      ).toBeInTheDocument();
    });

    // Verify metrics appear
    expect(screen.getByText("Goals")).toBeInTheDocument();
    expect(screen.getByText("Tackles")).toBeInTheDocument();
    expect(screen.getByText("Interceptions")).toBeInTheDocument();
    expect(screen.getByText("Clearances")).toBeInTheDocument();
  });

  it("shows an error message when the backend returns 500", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(teamsPayload))
      .mockResolvedValueOnce(
        new Response("boom", { status: 500, statusText: "Internal Server Error" }),
      );

    render(<ComparePage />);

    const comboboxes = await screen.findAllByRole("combobox");
    fireEvent.change(comboboxes[0], { target: { value: "768" } });
    fireEvent.change(comboboxes[1], { target: { value: "770" } });

    expect(
      await screen.findByText(/Failed to compare: HTTP 500/i),
    ).toBeInTheDocument();
  });

  it("adapts to backend object shape { team_a, team_b } without crashing", async () => {
    // Regression test: previously the page called data.slice(0, 2) which
    // crashed with "a.slice is not a function" because backend returned
    // an object, not an array.
    fetchMock
      .mockResolvedValueOnce(jsonResponse(teamsPayload))
      .mockResolvedValueOnce(jsonResponse(comparePayload));

    render(<ComparePage />);

    const comboboxes = await screen.findAllByRole("combobox");
    fireEvent.change(comboboxes[0], { target: { value: "768" } });
    fireEvent.change(comboboxes[1], { target: { value: "770" } });

    // Should NOT show slice error
    await waitFor(() => {
      expect(screen.queryByText(/a\.slice is not a function/i)).toBeNull();
    });

    // Should render comparison successfully
    expect(await screen.findByText(/Team Comparison/i)).toBeInTheDocument();
  });
});