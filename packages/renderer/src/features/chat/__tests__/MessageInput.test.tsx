import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "@/components/chat";

describe("MessageInput", () => {
  const defaultProps = {
    onSend: vi.fn(),
    onStop: vi.fn(),
    isStreaming: false,
  };

  it("renders textarea and send button", () => {
    render(<MessageInput {...defaultProps} />);
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
    expect(screen.getByTestId("send-button")).toBeInTheDocument();
  });

  it("does not render stop button when not streaming", () => {
    render(<MessageInput {...defaultProps} />);
    expect(screen.queryByTestId("stop-button")).not.toBeInTheDocument();
  });

  it("renders stop button when streaming", () => {
    render(<MessageInput {...defaultProps} isStreaming />);
    expect(screen.getByTestId("stop-button")).toBeInTheDocument();
  });

  it("calls onSend with trimmed content when send is clicked", async () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} onStop={vi.fn()} isStreaming={false} />);
    const input = screen.getByTestId("message-input");
    const sendButton = screen.getByTestId("send-button");
    await userEvent.type(input, "  Hello  ");
    await userEvent.click(sendButton);
    expect(onSend).toHaveBeenCalledWith("Hello");
  });

  it("does not call onSend when input is empty", async () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} onStop={vi.fn()} isStreaming={false} />);
    const sendButton = screen.getByTestId("send-button");
    await userEvent.click(sendButton);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("calls onStop when stop is clicked", async () => {
    const onStop = vi.fn();
    render(<MessageInput onSend={vi.fn()} onStop={onStop} isStreaming />);
    const stopButton = screen.getByTestId("stop-button");
    await userEvent.click(stopButton);
    expect(onStop).toHaveBeenCalled();
  });

  it("does not send when streaming", async () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} onStop={vi.fn()} isStreaming={true} />);
    const input = screen.getByTestId("message-input");
    await userEvent.type(input, "Hello");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("clears input after sending", async () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} onStop={vi.fn()} isStreaming={false} />);
    const input = screen.getByTestId("message-input") as HTMLTextAreaElement;
    await userEvent.type(input, "Hello");
    await userEvent.click(screen.getByTestId("send-button"));
    expect(input.value).toBe("");
  });

  it("renders custom placeholder", () => {
    render(<MessageInput {...defaultProps} placeholder="Ask something..." />);
    expect(screen.getByPlaceholderText(/ask something/i)).toBeInTheDocument();
  });
});
