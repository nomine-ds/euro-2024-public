import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const motionElement = (tag: "div" | "section") => {
    function MockMotion({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) {
      return React.createElement(tag, { className }, children);
    }
    MockMotion.displayName = `MockMotion(${tag})`;
    return MockMotion;
  };

  return {
    motion: {
      div: motionElement("div"),
      section: motionElement("section"),
    },
  };
});

describe("home page", () => {
  it("renders navigation links and loads event and 360 totals", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ total_events: 1234 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ match_id: 1 }, { match_id: 2 }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /Euro 2024 Context Zone/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Coba Hudl Bot/ }),
    ).toHaveAttribute("href", "/bot");
    expect(
      screen.getByRole("link", { name: /Player Comparison/ }),
    ).toHaveAttribute("href", "/player-comparison");
    expect(await screen.findByText(/1[.,]234/)).toBeInTheDocument();
    expect(await screen.findByText("2", { selector: "div.text-2xl" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://test.local/");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://test.local/matches/with360",
    );
  });
});
