import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ThemeToggle from "../ThemeToggle";

const { themeState, setTheme } = vi.hoisted(() => ({
  themeState: { resolvedTheme: "light" },
  setTheme: vi.fn(),
}));

vi.mock("@teispace/next-themes", () => ({
  useTheme: () => ({ ...themeState, setTheme }),
}));

describe("theme toggle", () => {
  beforeEach(() => {
    themeState.resolvedTheme = "light";
    setTheme.mockReset();
  });

  it("renders after mount and changes light theme to dark", async () => {
    render(<ThemeToggle />);
    fireEvent.click(await screen.findByRole("button", { name: "Toggle theme" }));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

});
