import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KeyboardShortcuts from "../KeyboardShortcuts";

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, () => void>(),
  push: vi.fn(),
  success: vi.fn(),
}));

vi.mock("react-hotkeys-hook", () => ({
  useHotkeys: (shortcut: string, callback: () => void) => {
    mocks.handlers.set(shortcut, callback);
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("react-hot-toast", () => ({
  default: { success: mocks.success },
}));

beforeEach(() => {
  mocks.handlers.clear();
  mocks.push.mockReset();
  mocks.success.mockReset();
});

describe("keyboard shortcuts", () => {
  it("routes shortcuts, opens help, and toggles the theme", () => {
    render(<KeyboardShortcuts />);

    act(() => mocks.handlers.get("g+h")?.());
    expect(mocks.push).toHaveBeenCalledWith("/");

    act(() => mocks.handlers.get("shift+slash")?.());
    expect(
      screen.getByRole("heading", { name: /Keyboard Shortcuts/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(10);

    const themeButton = document.createElement("button");
    themeButton.setAttribute("aria-label", "Toggle theme");
    const click = vi.spyOn(themeButton, "click");
    document.body.append(themeButton);

    act(() => mocks.handlers.get("shift+d")?.());
    expect(click).toHaveBeenCalledOnce();
    expect(mocks.success).toHaveBeenCalledWith("Dark mode toggled");

    fireEvent.click(screen.getByRole("button", { name: "×" }));
    expect(
      screen.queryByRole("heading", { name: /Keyboard Shortcuts/ }),
    ).toBeNull();
    themeButton.remove();
  });

  it("closes help from Escape and the backdrop", () => {
    render(<KeyboardShortcuts />);

    act(() => mocks.handlers.get("shift+slash")?.());
    act(() => mocks.handlers.get("esc")?.());
    expect(
      screen.queryByRole("heading", { name: /Keyboard Shortcuts/ }),
    ).toBeNull();

    act(() => mocks.handlers.get("shift+slash")?.());
    fireEvent.click(document.querySelector(".fixed.inset-0")!);
    expect(
      screen.queryByRole("heading", { name: /Keyboard Shortcuts/ }),
    ).toBeNull();
  });
});
