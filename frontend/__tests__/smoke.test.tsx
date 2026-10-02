import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function Hello() {
  return <h1>Hello Euro 2024</h1>;
}

describe("render smoke", () => {
  it("renders the heading", () => {
    render(<Hello />);
    expect(
      screen.getByRole("heading", { name: /hello euro 2024/i })
    ).toBeInTheDocument();
  });
});