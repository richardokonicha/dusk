import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatView } from "@/components/chat";
import type { Message, ChatState } from "@/types";

const mockMessage: Message = {
  id: "msg-1",
  conversationId: "conv-1",
  role: "user",
  blocks: [
    {
      id: "block-1",
      messageId: "msg-1",
      type: "text",
      content: "Hello, world!",
    },
  ],
  createdAt: new Date().toISOString(),
};

const mockChatState: ChatState = {
  messages: [mockMessage],
  isStreaming: false,
  streamingText: "",
  error: null,
  isLoading: false,
};

const defaultProps = {
  messages: [mockMessage],
  state: mockChatState,
  onSendMessage: vi.fn(),
  onStopStreaming: vi.fn(),
};

describe("ChatView", () => {
  it("renders messages", () => {
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
  });

  it("shows streaming indicator when streaming", () => {
    render(<ChatView {...defaultProps} state={{ ...mockChatState, isStreaming: true }} />);
    expect(screen.getByText(/assistant is typing/i)).toBeInTheDocument();
  });

  it("renders message input", () => {
    render(<ChatView {...defaultProps} />);
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
  });

  it("renders send button", () => {
    render(<ChatView {...defaultProps} />);
    expect(screen.getByTestId("send-button")).toBeInTheDocument();
  });

  it("renders stop button when streaming", () => {
    render(<ChatView {...defaultProps} state={{ ...mockChatState, isStreaming: true }} />);
    expect(screen.getByTestId("stop-button")).toBeInTheDocument();
  });

  it("calls onSendMessage when send is clicked", async () => {
    const onSendMessage = vi.fn();
    render(<ChatView {...defaultProps} onSendMessage={onSendMessage} />);
    const input = screen.getByTestId("message-input");
    const sendButton = screen.getByTestId("send-button");
    await userEvent.type(input, "Hello");
    await userEvent.click(sendButton);
    expect(onSendMessage).toHaveBeenCalledWith("Hello");
  });

  it("calls onStopStreaming when stop is clicked", async () => {
    const onStopStreaming = vi.fn();
    render(<ChatView {...defaultProps} state={{ ...mockChatState, isStreaming: true }} onStopStreaming={onStopStreaming} />);
    const stopButton = screen.getByTestId("stop-button");
    await userEvent.click(stopButton);
    expect(onStopStreaming).toHaveBeenCalled();
  });

  it("does not call onSendMessage when input is empty", async () => {
    const onSendMessage = vi.fn();
    render(<ChatView {...defaultProps} onSendMessage={onSendMessage} />);
    const sendButton = screen.getByTestId("send-button");
    await userEvent.click(sendButton);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("does not call onSendMessage when streaming", async () => {
    const onSendMessage = vi.fn();
    render(<ChatView {...defaultProps} state={{ ...mockChatState, isStreaming: true }} onSendMessage={onSendMessage} />);
    const input = screen.getByTestId("message-input");
    const sendButton = screen.getByTestId("stop-button");
    await userEvent.type(input, "Hello");
    expect(onSendMessage).not.toHaveBeenCalled();
  });
});
