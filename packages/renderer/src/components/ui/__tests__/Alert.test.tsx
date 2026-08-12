import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui";

describe("Alert", () => {
  it("renders title and description", () => {
    render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>Alert description text</AlertDescription>
      </Alert>
    );
    expect(screen.getByText("Alert Title")).toBeInTheDocument();
    expect(screen.getByText("Alert description text")).toBeInTheDocument();
  });

  it("applies role='alert'", () => {
    render(<Alert>Alert content</Alert>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("applies default variant styling", () => {
    render(<Alert data-testid="alert">Content</Alert>);
    const alert = screen.getByTestId("alert");
    expect(alert.className).toContain("bg-background");
  });

  it("applies destructive variant", () => {
    render(<Alert variant="destructive" data-testid="alert">Error</Alert>);
    const alert = screen.getByTestId("alert");
    expect(alert.className).toContain("border-destructive");
  });

  it("forwards additional className", () => {
    render(<Alert className="custom-alert" data-testid="alert">Content</Alert>);
    const alert = screen.getByTestId("alert");
    expect(alert.className).toContain("custom-alert");
  });
});
