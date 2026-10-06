import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BotPage from "./page";

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }));

describe("Hudl Bot", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders the answer and its source context", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          answer: "Spain won the final.",
          context: [{ text: "Spain 2, England 1" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(<BotPage />);

    fireEvent.change(screen.getByRole("textbox", { name: "Your question" }), {
      target: { value: "Who won the final?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByText("Spain won the final.")).toBeInTheDocument();
    expect(screen.getByText(/konteks data/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "http://test.local/bot/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "Who won the final?" }),
      }),
    );
  });

  it("shows a useful message when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Bot unavailable", { status: 503 }),
    );
    render(<BotPage />);

    fireEvent.change(screen.getByRole("textbox", { name: "Your question" }), {
      target: { value: "Tell me about the final" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    expect(
      await screen.findByText(/Failed to get a response: HTTP 503/),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
