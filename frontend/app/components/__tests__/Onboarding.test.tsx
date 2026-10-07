import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Onboarding, {
  TOUR_OPEN_EVENT,
  resetOnboarding,
  isTourDismissed,
} from "../Onboarding";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

function renderOnboarding() {
  return render(
    <div data-tour="nav">
      <Onboarding />
    </div>,
  );
}

function openTour() {
  renderOnboarding();
  act(() => {
    window.dispatchEvent(new Event(TOUR_OPEN_EVENT));
  });
}

describe("onboarding tour", () => {
  it("does not auto-open on mount", () => {
    renderOnboarding();
    // No dialog should be present without explicit trigger
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /Welcome to Euro 2024 Context Zone/ }),
    ).toBeNull();
  });

  it("opens on TOUR_OPEN_EVENT dispatch", () => {
    openTour();
    expect(
      screen.getByRole("heading", {
        name: /Welcome to Euro 2024 Context Zone/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 7")).toBeInTheDocument();
  });

  it("navigates forward and backward through steps", () => {
    openTour();

    fireEvent.click(screen.getByRole("button", { name: /^Next$/ }));
    expect(
      screen.getByRole("heading", { name: /Main Navigation/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 7")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 7")).toBeInTheDocument();

    // Previous should be enabled on step 2
    fireEvent.click(screen.getByRole("button", { name: /Previous/ }));
    expect(screen.getByText("Step 1 of 7")).toBeInTheDocument();
  });

  it("supports keyboard navigation with arrow keys", () => {
    openTour();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("Step 2 of 7")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("Step 1 of 7")).toBeInTheDocument();
  });

  it("closes via Skip tour and persists dismissal in localStorage", () => {
    openTour();

    fireEvent.click(screen.getByRole("button", { name: /Skip tour/ }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem("euro2024_tour_dismissed")).toBe("true");
    expect(isTourDismissed()).toBe(true);
  });

  it("closes via Escape key", () => {
    openTour();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem("euro2024_tour_dismissed")).toBe("true");
  });

  it("closes via close (X) button", () => {
    openTour();

    fireEvent.click(screen.getByRole("button", { name: /Close tour/ }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem("euro2024_tour_dismissed")).toBe("true");
  });

  it("finishes after the final step", () => {
    openTour();

    // Step through 6 times to reach step 7 (index 6)
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: /^Next$/ }));
    }

    expect(screen.getByText("Step 7 of 7")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Start Exploring/ }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem("euro2024_tour_completed")).toBe("true");
    expect(localStorage.getItem("euro2024_tour_dismissed")).toBe("true");
  });

  it("resetOnboarding clears storage and reloads", () => {
    localStorage.setItem("euro2024_tour_dismissed", "true");
    localStorage.setItem("euro2024_tour_completed", "true");

    const reload = vi.fn();
    const originalLocation = window.location;
    // @ts-expect-error override
    delete window.location;
    // @ts-expect-error minimal stub
    window.location = { ...originalLocation, reload };

    resetOnboarding();

    expect(localStorage.getItem("euro2024_tour_dismissed")).toBeNull();
    expect(localStorage.getItem("euro2024_tour_completed")).toBeNull();
    expect(reload).toHaveBeenCalled();

    // @ts-expect-error restore
    window.location = originalLocation;
  });
});