import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CardGridSkeleton,
  ChartSkeleton,
  MatchDetailSkeleton,
  TableSkeleton,
} from "../Skeleton";

describe("loading skeletons", () => {
  it("renders the requested table rows", () => {
    const { container } = render(<TableSkeleton rows={3} />);

    expect(container.querySelectorAll(".px-4.py-3")).toHaveLength(3);
  });

  it("renders the requested card count", () => {
    const { container } = render(<CardGridSkeleton cards={2} />);

    expect(container.querySelector(".grid")?.children).toHaveLength(2);
  });

  it("renders a chart placeholder with its configured height", () => {
    const { container } = render(<ChartSkeleton height={180} />);

    expect(container.querySelectorAll(".react-loading-skeleton")[1]).toHaveStyle({
      height: "180px",
    });
  });

  it("renders the match detail placeholders", () => {
    const { container } = render(<MatchDetailSkeleton />);

    expect(container.querySelectorAll(".grid > div")).toHaveLength(4);
    expect(container.querySelectorAll(".react-loading-skeleton").length).toBeGreaterThan(0);
  });
});
