import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "../Navbar";

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn<() => string | null>(),
}));

vi.mock("next/navigation", () => ({ usePathname }));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));
vi.mock("../ThemeToggle", () => ({
  default: () => <button aria-label="Toggle theme" />,
}));

describe("navigation", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/players/42");
  });

  it("marks the matching route active", () => {
    render(<Navbar />);

    const playersLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/players");
    expect(playersLink).toHaveClass("bg-blue-100");
  });

  it("opens and closes the mobile menu after navigation", () => {
    render(<Navbar />);
    const menuButton = screen.getByRole("button", { name: "Toggle menu" });

    fireEvent.click(menuButton);
    expect(screen.getAllByRole("link", { name: /Data Lab/ })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("link", { name: /Data Lab/ })[1]);
    expect(screen.getAllByRole("link", { name: /Data Lab/ })).toHaveLength(1);

    fireEvent.click(menuButton);
    expect(screen.getAllByRole("link", { name: /Data Lab/ })).toHaveLength(2);
  });
});
