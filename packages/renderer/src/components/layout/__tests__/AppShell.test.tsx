import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";
import type { SidebarProps } from "@/components/layout/Sidebar";
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

const defaultSidebarProps: SidebarProps = {
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

describe("AppShell", () => {
  it("renders children", () => {
    render(
      <AppShell sidebarOpen={true} onToggleSidebar={vi.fn()} sidebar={defaultSidebarProps}>
        <div data-testid="child">Content</div>
      </AppShell>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders sidebar when open", () => {
    render(
      <AppShell sidebarOpen={true} onToggleSidebar={vi.fn()} sidebar={defaultSidebarProps}>
        <div>Content</div>
      </AppShell>
    );
    expect(screen.getByText("Dusk")).toBeInTheDocument();
  });

  it("renders collapsed sidebar when closed", () => {
    const { container } = render(
      <AppShell sidebarOpen={false} onToggleSidebar={vi.fn()} sidebar={defaultSidebarProps}>
        <div>Content</div>
      </AppShell>
    );
    expect(container.querySelector(".border-r")).toBeTruthy();
  });

  it("calls onToggleSidebar when sidebar toggle is triggered", async () => {
    const onToggleSidebar = vi.fn();
    render(
      <AppShell sidebarOpen={true} onToggleSidebar={onToggleSidebar} sidebar={defaultSidebarProps}>
        <div>Content</div>
      </AppShell>
    );
    const collapseButton = screen.getByText("Collapse");
    await collapseButton.click();
    expect(onToggleSidebar).toHaveBeenCalled();
  });

  it("renders right panel when provided", () => {
    render(
      <AppShell sidebarOpen={true} onToggleSidebar={vi.fn()} sidebar={defaultSidebarProps} rightPanel={<div data-testid="right-panel">Panel</div>}>
        <div>Content</div>
      </AppShell>
    );
    expect(screen.getByTestId("right-panel")).toBeInTheDocument();
  });

  it("does not render right panel when not provided", () => {
    render(
      <AppShell sidebarOpen={true} onToggleSidebar={vi.fn()} sidebar={defaultSidebarProps}>
        <div>Content</div>
      </AppShell>
    );
    expect(screen.queryByTestId("right-panel")).not.toBeInTheDocument();
  });

  it("has correct layout structure", () => {
    const { container } = render(
      <AppShell sidebarOpen={true} onToggleSidebar={vi.fn()} sidebar={defaultSidebarProps}>
        <div>Content</div>
      </AppShell>
    );
    expect(container.querySelector(".flex.h-screen")).toBeTruthy();
    expect(container.querySelector("main")).toBeTruthy();
  });
});
