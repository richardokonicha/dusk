import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Progress } from "@/components/ui";

describe("Progress", () => {
  it("renders with default value", () => {
    render(<Progress data-testid="progress" />);
    const progress = screen.getByTestId("progress");
    expect(progress).toHaveAttribute("role", "progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "0");
  });

  it("renders with custom value", () => {
    render(<Progress value={75} data-testid="progress" />);
    const progress = screen.getByTestId("progress");
    expect(progress).toHaveAttribute("aria-valuenow", "75");
  });

  it("renders with custom max", () => {
    render(<Progress value={50} max={200} data-testid="progress" />);
    const progress = screen.getByTestId("progress");
    expect(progress).toHaveAttribute("aria-valuemax", "200");
  });

  it("clamps value to 0-100", () => {
    render(<Progress value={150} data-testid="progress" />);
    const progress = screen.getByTestId("progress");
    expect(progress).toHaveAttribute("aria-valuenow", "100");
  });

  it("applies custom className", () => {
    render(<Progress className="custom-progress" data-testid="progress" />);
    const progress = screen.getByTestId("progress");
    expect(progress).toHaveClass("custom-progress");
  });

  it("applies indicator className", () => {
    render(<Progress indicatorClassName="custom-indicator" data-testid="progress" />);
    const indicator = document.querySelector(".custom-indicator");
    expect(indicator).toBeInTheDocument();
  });
});
