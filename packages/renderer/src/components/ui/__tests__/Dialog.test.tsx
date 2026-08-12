import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui";

describe("Dialog", () => {
  it("renders dialog content when open", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText("Dialog Title")).toBeInTheDocument();
    expect(screen.getByText("Dialog description")).toBeInTheDocument();
  });

  it("renders DialogFooter with actions", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogFooter>
            <button type="button">Cancel</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("applies custom className to content wrapper", () => {
    render(
      <Dialog open>
        <DialogContent className="custom-dialog">
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const content = document.querySelector("[role='dialog']");
    expect(content).toHaveClass("custom-dialog");
  });

  it("renders DialogClose button", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogClose>
            <button type="button">X</button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText("X")).toBeInTheDocument();
  });

  it("renders DialogTrigger when closed", () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button type="button">Open Dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Opened</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText("Open Dialog")).toBeInTheDocument();
  });

  it("applies close button sr-only text", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText("Close")).toHaveClass("sr-only");
  });
});
