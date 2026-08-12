import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui";

describe("Card", () => {
  it("renders children correctly", () => {
    render(
      <Card>
        <CardContent>Card content</CardContent>
      </Card>
    );
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies default variant styling", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-card");
    expect(card.className).toContain("border-border");
  });

  it("applies outline variant", () => {
    render(<Card variant="outline" data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-transparent");
  });

  it("renders CardHeader with title and description", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("renders CardFooter with actions", () => {
    render(
      <Card>
        <CardFooter>
          <button type="button">Action</button>
        </CardFooter>
      </Card>
    );
    expect(screen.getByRole("button", { name: /action/i })).toBeInTheDocument();
  });

  it("renders CardContent independently", () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("forwards additional className", () => {
    render(<Card className="custom-class" data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("custom-class");
  });
});
