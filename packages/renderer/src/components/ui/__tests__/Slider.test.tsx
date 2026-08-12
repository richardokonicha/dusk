import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Slider } from "@/components/ui";

describe("Slider", () => {
  it("renders slider with default value", () => {
    render(<Slider data-testid="slider" value={[50]} />);
    const slider = screen.getByTestId("slider");
    expect(slider).toHaveAttribute("role", "slider");
    expect(slider).toHaveAttribute("aria-valuenow", "50");
  });

  it("renders with min and max", () => {
    render(<Slider data-testid="slider" min={0} max={200} value={[100]} />);
    const slider = screen.getByTestId("slider");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "200");
  });

  it("calls onValueChange on pointer interaction", () => {
    const onChange = vi.fn();
    render(<Slider data-testid="slider" value={[0]} onValueChange={onChange} />);
    const slider = screen.getByTestId("slider");
    fireEvent.pointerDown(slider, { clientX: 50 });
    expect(onChange).toHaveBeenCalled();
  });

  it("renders disabled state", () => {
    render(<Slider disabled data-testid="slider" />);
    const slider = screen.getByTestId("slider");
    expect(slider).toHaveAttribute("aria-disabled", "true");
  });

  it("applies custom className", () => {
    render(<Slider className="custom-slider" data-testid="slider" />);
    const slider = screen.getByTestId("slider");
    expect(slider).toHaveClass("custom-slider");
  });

  it("handles step changes", () => {
    render(<Slider data-testid="slider" step={10} value={[30]} />);
    const slider = screen.getByTestId("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "30");
  });
});
