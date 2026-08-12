import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Label } from "@/components/ui";

describe("Label", () => {
  it("renders children", () => {
    render(<Label>Test Label</Label>);
    expect(screen.getByText("Test Label")).toBeInTheDocument();
  });

  it("renders as label element", () => {
    render(<Label>Label</Label>);
    expect(screen.getByText("Label").tagName).toBe("LABEL");
  });

  it("associates with input via htmlFor", () => {
    render(<Label htmlFor="email-input">Email</Label>);
    const label = screen.getByText("Email");
    expect(label).toHaveAttribute("for", "email-input");
  });

  it("applies custom className", () => {
    render(<Label className="custom-label">Label</Label>);
    const label = screen.getByText("Label");
    expect(label).toHaveClass("custom-label");
  });

  it("applies default font-medium class", () => {
    render(<Label>Label</Label>);
    const label = screen.getByText("Label");
    expect(label).toHaveClass("font-medium");
  });
});
