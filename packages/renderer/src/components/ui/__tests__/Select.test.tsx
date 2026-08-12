import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/components/ui";

describe("Select", () => {
  it("renders trigger button", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByText("Select option")).toBeInTheDocument();
  });

  it("opens content on trigger click", async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger data-testid="trigger">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
        </SelectContent>
      </Select>
    );
    await user.click(screen.getByTestId("trigger"));
    expect(screen.getByText("Option A")).toBeInTheDocument();
  });

  it("renders grouped items", async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger data-testid="trigger">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Group A</SelectLabel>
            <SelectItem value="a">Option A</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    await user.click(screen.getByTestId("trigger"));
    expect(screen.getByText("Group A")).toBeInTheDocument();
  });

  it("renders item with value", async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger data-testid="trigger">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="test">Test Option</SelectItem>
        </SelectContent>
      </Select>
    );
    await user.click(screen.getByTestId("trigger"));
    expect(screen.getByText("Test Option")).toBeInTheDocument();
  });

  it("applies custom className to trigger", () => {
    render(
      <Select>
        <SelectTrigger className="custom-trigger" data-testid="trigger">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByTestId("trigger")).toHaveClass("custom-trigger");
  });
});
