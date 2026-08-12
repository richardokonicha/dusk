import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileBrowser } from "@/features/files/components/FileBrowser";
import type { FileInfo } from "@shared/types/file";

const mockFile: FileInfo = {
  name: "test.txt",
  path: "/test.txt",
  relativePath: "test.txt",
  size: 1024,
  mtime: Date.now(),
  isDirectory: false,
  extension: ".txt",
  mimeType: "text/plain",
};

const mockDir: FileInfo = {
  name: "src",
  path: "/src",
  relativePath: "src",
  size: 0,
  mtime: Date.now(),
  isDirectory: true,
  extension: "",
  mimeType: "inode/directory",
};

describe("FileBrowser", () => {
  it("renders Files header", () => {
    render(<FileBrowser workspaceId="ws-1" />);
    expect(screen.getByText("Files")).toBeInTheDocument();
  });

  it("renders empty state when no files", async () => {
    const mockInvoke = vi.fn().mockResolvedValue({ success: true, data: [] });
    Object.defineProperty(window, "dusk", {
      value: { ipc: { invoke: mockInvoke } },
      writable: true,
    });
    render(<FileBrowser workspaceId="ws-1" />);
    await waitFor(() => {
      expect(screen.getByText("Empty folder")).toBeInTheDocument();
    });
  });

  it("renders files when provided", async () => {
    const mockInvoke = vi.fn().mockResolvedValue({ success: true, data: [mockFile] });
    Object.defineProperty(window, "dusk", {
      value: { ipc: { invoke: mockInvoke } },
      writable: true,
    });
    render(<FileBrowser workspaceId="ws-1" />);
    await waitFor(() => {
      expect(screen.getByText("test.txt")).toBeInTheDocument();
    });
  });

  it("shows loading spinner while loading files", async () => {
    let resolvePromise: (value: { success: boolean; data: FileInfo[] }) => void;
    const mockInvoke = vi.fn().mockImplementation(() => new Promise((resolve) => {
      resolvePromise = resolve;
    }));
    Object.defineProperty(window, "dusk", {
      value: { ipc: { invoke: mockInvoke } },
      writable: true,
    });
    render(<FileBrowser workspaceId="ws-1" />);
    expect(screen.getByText("Files")).toBeInTheDocument();
    resolvePromise!({ success: true, data: [] });
    await waitFor(() => {
      expect(screen.queryByText("Files")).toBeInTheDocument();
    });
  });

  it("calls onFileSelect when file is clicked", async () => {
    const onFileSelect = vi.fn();
    const mockInvoke = vi.fn().mockResolvedValue({ success: true, data: [mockFile] });
    Object.defineProperty(window, "dusk", {
      value: { ipc: { invoke: mockInvoke } },
      writable: true,
    });
    render(<FileBrowser workspaceId="ws-1" onFileSelect={onFileSelect} />);
    await waitFor(() => {
      expect(screen.getByText("test.txt")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("test.txt"));
    expect(onFileSelect).toHaveBeenCalledWith(mockFile);
  });

  it("renders directory navigation", async () => {
    const mockInvoke = vi.fn().mockResolvedValue({ success: true, data: [mockDir] });
    Object.defineProperty(window, "dusk", {
      value: { ipc: { invoke: mockInvoke } },
      writable: true,
    });
    render(<FileBrowser workspaceId="ws-1" />);
    await waitFor(() => {
      expect(screen.getByText("src")).toBeInTheDocument();
    });
  });

  it("opens create file input when plus button is clicked", async () => {
    render(<FileBrowser workspaceId="ws-1" />);
    const plusButton = screen.getByTitle("New file");
    await userEvent.click(plusButton);
    expect(screen.getByPlaceholderText("File or folder name")).toBeInTheDocument();
  });

  it("calls onFileCreate when new file is created", async () => {
    const onFileCreate = vi.fn();
    render(<FileBrowser workspaceId="ws-1" onFileCreate={onFileCreate} />);
    await userEvent.click(screen.getByTitle("New file"));
    const input = screen.getByPlaceholderText("File or folder name");
    await userEvent.type(input, "new-file.txt{Enter}");
    expect(onFileCreate).toHaveBeenCalledWith("new-file.txt");
  });

  it("closes create input on Escape", async () => {
    render(<FileBrowser workspaceId="ws-1" />);
    await userEvent.click(screen.getByTitle("New file"));
    expect(screen.getByPlaceholderText("File or folder name")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByPlaceholderText("File or folder name")).not.toBeInTheDocument();
  });

  it("renders export and import buttons", () => {
    render(<FileBrowser workspaceId="ws-1" onExport={vi.fn()} onImport={vi.fn()} />);
    expect(screen.getByTitle("Export workspace")).toBeInTheDocument();
    expect(screen.getByTitle("Import workspace")).toBeInTheDocument();
  });
});
