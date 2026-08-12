import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "@/components/ui";

describe("Avatar", () => {
  it("renders fallback initials", () => {
    render(<Avatar fallback="John Doe" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders question mark when no fallback", () => {
    render(<Avatar />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("renders image when src provided", () => {
    render(<Avatar src="https://example.com/avatar.png" alt="User avatar" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("applies custom className", () => {
    render(<Avatar className="custom-avatar" data-testid="avatar" />);
    const avatar = screen.getByTestId("avatar");
    expect(avatar).toHaveClass("custom-avatar");
  });

  it("uses fallback as alt text when no alt provided but src exists", () => {
    render(<Avatar fallback="John Doe" src="https://example.com/avatar.png" />);
    const avatar = document.querySelector("[alt='John Doe']");
    expect(avatar).toBeInTheDocument();
  });
});
