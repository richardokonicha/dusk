import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ToastProvider,
  useToast,
  ToastViewport,
  Toast,
  ToastClose,
  ToastTitle,
  ToastDescription,
  ToastAction,
} from "@/components/ui";

describe("Toast", () => {
  it("renders toast with title and description", () => {
    render(
      <ToastProvider>
        <ToastViewport />
        <Toast open>
          <ToastTitle>Toast Title</ToastTitle>
          <ToastDescription>Toast description</ToastDescription>
        </Toast>
      </ToastProvider>
    );
    expect(screen.getByText("Toast Title")).toBeInTheDocument();
    expect(screen.getByText("Toast description")).toBeInTheDocument();
  });

  it("renders close button", () => {
    render(
      <ToastProvider>
        <ToastViewport />
        <Toast open>
          <ToastClose />
        </Toast>
      </ToastProvider>
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders toast action", () => {
    const onClick = vi.fn();
    render(
      <ToastProvider>
        <ToastViewport />
        <Toast open>
          <ToastAction altText="Undo action" onClick={onClick}>Undo</ToastAction>
        </Toast>
      </ToastProvider>
    );
    expect(screen.getByText("Undo")).toBeInTheDocument();
  });

  it("renders viewport element", () => {
    const { container } = render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    );
    const viewport = container.querySelector("[role='region']");
    expect(viewport).toBeInTheDocument();
  });

  it("applies custom className to toast", () => {
    const { container } = render(
      <ToastProvider>
        <ToastViewport />
        <Toast open className="custom-toast">
          <ToastTitle>Title</ToastTitle>
        </Toast>
      </ToastProvider>
    );
    const toast = container.querySelector("[data-radix-collection-item]");
    expect(toast).toHaveClass("custom-toast");
  });
});

describe("useToast", () => {
  function TestComponent() {
    const { toast, toasts } = useToast();
    return (
      <div>
        <button onClick={() => toast({ title: "Test" })}>Add Toast</button>
        {toasts.map((t) => (
          <div key={t.id}>{t.options.title}</div>
        ))}
      </div>
    );
  }

  it("adds a toast", async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    await user.click(screen.getByText("Add Toast"));
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
