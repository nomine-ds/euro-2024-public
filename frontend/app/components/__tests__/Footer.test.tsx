import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Footer from "../Footer";

describe("footer", () => {
  it("renders real navigation destinations and the data source", () => {
    render(<Footer />);

    expect(
      screen.getByRole("link", { name: "Players" }),
    ).toHaveAttribute("href", "/players");
    expect(
      screen.getByRole("link", { name: "Hudl Bot" }),
    ).toHaveAttribute("href", "/bot");
    expect(
      screen.getByRole("link", { name: /StatsBomb Open Data/ }),
    ).toHaveAttribute("href", "https://github.com/statsbomb/open-data");
    expect(
      screen.getByRole("button", { name: /Lihat Tour Lagi/ }),
    ).toBeInTheDocument();
  });
});
