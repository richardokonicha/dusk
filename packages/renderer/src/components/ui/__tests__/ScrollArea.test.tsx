import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScrollArea } from "@/components/ui";

describe("ScrollArea", () => {
  it("renders children", () => {
    render(
      <ScrollArea data-testid="scroll-area">
        <div>Scrollable content</div>
      </ScrollArea>
    );
    expect(screen.getByText("Scrollable content")).toBeInTheDocument();
  });

  it("applies vertical scrolling by default", () => {
    render(
      <ScrollArea data-testid="scroll-area">
        <div>Content</div>
      </ScrollArea>
    );
    const area = screen.getByTestId("scroll-area");
    expect(area).toHaveClass("overflow-y-auto");
  });

  it("applies horizontal scrolling", () => {
    render(
      <ScrollArea orientation="horizontal" data-testid="scroll-area">
        <div>Content</div>
      </ScrollArea>
    );
    const area = screen.getByTestId("scroll-area");
    expect(area).toHaveClass("overflow-x-auto");
  });

  it("applies both scrolling", () => {
    render(
      <ScrollArea orientation="both" data-testid="scroll-area">
        <div>Content</div>
      </ScrollArea>
    );
    const area = screen.getByTestId("scroll-area");
    expect(area).toHaveClass("overflow-auto");
  });

  it("applies custom className", () => {
    render(
      <ScrollArea className="custom-area" data-testid="scroll-area">
        <div>Content</div>
      </ScrollArea>
    );
    const area = screen.getByTestId("scroll-area");
    expect(area).toHaveClass("custom-area");
  });
});
