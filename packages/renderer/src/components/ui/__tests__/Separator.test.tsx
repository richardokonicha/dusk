import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Separator } from "@/components/ui";

describe("Separator", () => {
  it("renders horizontal separator by default", () => {
    render(<Separator data-testid="separator" />);
    const separator = screen.getByTestId("separator");
    expect(separator).toHaveClass("h-[1px]");
    expect(separator).toHaveClass("w-full");
  });

  it("renders vertical separator", () => {
    render(<Separator orientation="vertical" data-testid="separator" />);
    const separator = screen.getByTestId("separator");
    expect(separator).toHaveClass("h-full");
    expect(separator).toHaveClass("w-[1px]");
  });

  it("has decorative role by default", () => {
    render(<Separator data-testid="separator" />);
    const separator = screen.getByTestId("separator");
    expect(separator).toHaveAttribute("role", "none");
  });

  it("has separator role when not decorative", () => {
    render(<Separator decorative={false} data-testid="separator" />);
    const separator = screen.getByTestId("separator");
    expect(separator).toHaveAttribute("role", "separator");
    expect(separator).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("applies custom className", () => {
    render(<Separator className="custom-separator" data-testid="separator" />);
    const separator = screen.getByTestId("separator");
    expect(separator).toHaveClass("custom-separator");
  });
});
