import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "@/components/ui";

describe("Skeleton", () => {
  it("renders text variant by default", () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("rounded");
  });

  it("renders circular variant", () => {
    render(<Skeleton variant="circular" data-testid="skeleton" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("rounded-full");
  });

  it("renders rectangular variant", () => {
    render(<Skeleton variant="rectangular" data-testid="skeleton" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("rounded-md");
  });

  it("applies custom width", () => {
    render(<Skeleton width={100} data-testid="skeleton" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveStyle({ width: "100px" });
  });

  it("applies custom height", () => {
    render(<Skeleton height={50} data-testid="skeleton" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveStyle({ height: "50px" });
  });

  it("applies custom className", () => {
    render(<Skeleton className="custom-skeleton" data-testid="skeleton" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("custom-skeleton");
  });

  it("has animate-pulse class", () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("animate-pulse");
  });
});
