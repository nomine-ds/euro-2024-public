import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Onboarding from "../Onboarding";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function showTour() {
  render(
    <div data-tour="nav">
      <Onboarding />
    </div>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
}

describe("onboarding tour", () => {
  it("moves between steps and dismisses from the keyboard", async () => {
    await showTour();

    expect(
      screen.getByRole("heading", {
        name: /Welcome to Euro 2024 Context Zone|Selamat Datang di Euro 2024 Context Zone/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 7")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next →" }));
    expect(
      screen.getByRole("heading", {
        name: /Main Navigation|Navigasi Utama/,
      }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".fixed.z-\\[1000\\]")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /Sebelumnya/ }));
    expect(screen.getByText("1 / 7")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2 / 7")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("heading", { name: /Main Navigation|Navigasi Utama/ }),
    ).toBeNull();
    expect(localStorage.getItem("euro2024_seen_onboarding")).toBe("true");
  });

  it("finishes after the final step", async () => {
    await showTour();

    for (let step = 0; step < 6; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next →" }));
    }

    expect(screen.getByText("7 / 7")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Start Exploring 🚀" }),
    );
    expect(localStorage.getItem("euro2024_seen_onboarding")).toBe("true");
  });
});
