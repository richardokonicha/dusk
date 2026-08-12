import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui";

describe("Badge", () => {
  it("renders children correctly", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("applies default variant", () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-primary");
  });

  it("applies secondary variant", () => {
    render(<Badge variant="secondary" data-testid="badge">Secondary</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-secondary");
  });

  it("applies outline variant", () => {
    render(<Badge variant="outline" data-testid="badge">Outline</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("text-foreground");
  });

  it("applies destructive variant", () => {
    render(<Badge variant="destructive" data-testid="badge">Error</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-destructive");
  });

  it("forwards additional props", () => {
    render(<Badge data-testid="custom-badge">Custom</Badge>);
    const badge = screen.getByTestId("custom-badge");
    expect(badge).toBeInTheDocument();
  });
});
