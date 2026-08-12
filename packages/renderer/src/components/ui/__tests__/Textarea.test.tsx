import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "@/components/ui";

describe("Textarea", () => {
  it("renders with placeholder", () => {
    render(<Textarea placeholder="Enter text" />);
    expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();
  });

  it("handles value changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea onChange={onChange} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "hello");
    expect(onChange).toHaveBeenCalled();
  });

  it("displays error message", () => {
    render(<Textarea error="This field is required" />);
    expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
  });

  it("applies error border styling", () => {
    render(<Textarea error="Error" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toContain("border-destructive");
  });

  it("does not apply error border when no error", () => {
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).not.toContain("border-destructive");
  });

  it("can be disabled", () => {
    render(<Textarea disabled />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeDisabled();
  });

  it("forwards additional props", () => {
    render(<Textarea data-testid="custom-textarea" aria-label="Custom textarea" />);
    const textarea = screen.getByTestId("custom-textarea");
    expect(textarea).toHaveAttribute("aria-label", "Custom textarea");
  });
});
