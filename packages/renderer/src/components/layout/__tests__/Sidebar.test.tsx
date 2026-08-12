import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/components/layout/Sidebar";
import type { Workspace, Conversation } from "@/types";

const mockWorkspace: Workspace = {
  id: "ws-1",
  name: "Test Workspace",
  description: "A test workspace",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

const mockConversation: Conversation = {
  id: "conv-1",
  workspaceId: "ws-1",
  title: "Test Conversation",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

const defaultProps = {
  workspaces: [mockWorkspace],
  currentWorkspace: mockWorkspace,
  onSelectWorkspace: vi.fn(),
  onCreateWorkspace: vi.fn(),
  onDeleteWorkspace: vi.fn(),
  conversations: [mockConversation],
  currentConversation: mockConversation,
  onSelectConversation: vi.fn(),
  onCreateConversation: vi.fn(),
  onDeleteConversation: vi.fn(),
};

describe("Sidebar", () => {
  it("renders brand name", () => {
    render(<Sidebar {...defaultProps} isOpen onToggle={vi.fn()} />);
    expect(screen.getByText("Dusk")).toBeInTheDocument();
  });

  it("renders workspace list", () => {
    render(<Sidebar {...defaultProps} isOpen onToggle={vi.fn()} />);
    expect(screen.getByText("Test Workspace")).toBeInTheDocument();
  });

  it("renders conversations when workspace is selected", () => {
    render(<Sidebar {...defaultProps} isOpen onToggle={vi.fn()} />);
    expect(screen.getByText("Test Conversation")).toBeInTheDocument();
  });

  it("does not render conversations when no workspace is selected", () => {
    render(<Sidebar {...defaultProps} isOpen onToggle={vi.fn()} currentWorkspace={null} />);
    expect(screen.queryByText("Test Conversation")).not.toBeInTheDocument();
  });

  it("calls onSelectWorkspace when workspace is clicked", async () => {
    const onSelectWorkspace = vi.fn();
    render(<Sidebar {...defaultProps} isOpen onToggle={vi.fn()} onSelectWorkspace={onSelectWorkspace} />);
    await userEvent.click(screen.getByText("Test Workspace"));
    expect(onSelectWorkspace).toHaveBeenCalledWith(mockWorkspace);
  });

  it("calls onToggle when collapse button is clicked", async () => {
    const onToggle = vi.fn();
    render(<Sidebar {...defaultProps} isOpen onToggle={onToggle} />);
    await userEvent.click(screen.getByText("Collapse"));
    expect(onToggle).toHaveBeenCalled();
  });

  it("renders Dashboard and Settings nav items", () => {
    render(<Sidebar {...defaultProps} isOpen onToggle={vi.fn()} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders collapsed sidebar when not open", () => {
    render(<Sidebar {...defaultProps} isOpen={false} onToggle={vi.fn()} />);
    expect(screen.queryByText("Collapse")).not.toBeInTheDocument();
  });
});
