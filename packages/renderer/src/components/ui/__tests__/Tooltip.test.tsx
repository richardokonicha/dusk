import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui";

describe("Tooltip", () => {
  it("renders tooltip content when open", () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger asChild>
            <button type="button">Trigger</button>
          </TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByText("Tooltip text")).toBeInTheDocument();
  });

  it("renders trigger element", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button">Trigger</button>
          </TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByText("Trigger")).toBeInTheDocument();
  });

  it("applies custom className to content", () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger asChild>
            <button type="button">Trigger</button>
          </TooltipTrigger>
          <TooltipContent className="custom-tooltip">Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    const content = document.querySelector("[data-radix-popper-content-wrapper] > div");
    expect(content).toHaveClass("custom-tooltip");
  });

  it("renders within provider with delay", () => {
    render(
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button">Trigger</button>
          </TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByText("Trigger")).toBeInTheDocument();
  });
});
