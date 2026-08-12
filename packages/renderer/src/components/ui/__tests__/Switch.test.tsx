import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "@/components/ui";

describe("Switch", () => {
  it("renders unchecked by default", () => {
    render(<Switch data-testid="switch" />);
    const switchEl = screen.getByTestId("switch");
    expect(switchEl).toHaveAttribute("data-state", "unchecked");
  });

  it("toggles on click", async () => {
    const user = userEvent.setup();
    render(<Switch data-testid="switch" />);
    const switchEl = screen.getByTestId("switch");
    await user.click(switchEl);
    expect(switchEl).toHaveAttribute("data-state", "checked");
  });

  it("respects checked prop", () => {
    render(<Switch checked data-testid="switch" />);
    const switchEl = screen.getByTestId("switch");
    expect(switchEl).toHaveAttribute("data-state", "checked");
  });

  it("can be disabled", () => {
    render(<Switch disabled data-testid="switch" />);
    const switchEl = screen.getByTestId("switch");
    expect(switchEl.closest("[data-disabled]")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Switch className="custom-switch" data-testid="switch" />);
    const switchEl = screen.getByTestId("switch");
    expect(switchEl).toHaveClass("custom-switch");
  });

  it("renders check indicator", () => {
    render(<Switch checked data-testid="switch" />);
    const switchEl = screen.getByTestId("switch");
    expect(switchEl.querySelector("svg")).toBeInTheDocument();
  });
});
