import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "@/components/chat";
import type { Message } from "@/types";

const mockUserMessage: Message = {
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

const mockAssistantMessage: Message = {
  id: "msg-2",
  conversationId: "conv-1",
  role: "assistant",
  blocks: [
    {
      id: "block-2",
      messageId: "msg-2",
      type: "text",
      content: "I can help with that.",
    },
    {
      id: "block-3",
      messageId: "msg-2",
      type: "tool",
      content: '{"name": "search", "result": "found"}',
      metadata: { toolName: "search" },
    },
  ],
  createdAt: new Date().toISOString(),
};

const mockErrorMessage: Message = {
  id: "msg-3",
  conversationId: "conv-1",
  role: "assistant",
  blocks: [
    {
      id: "block-4",
      messageId: "msg-3",
      type: "error",
      content: "Something went wrong.",
    },
  ],
  createdAt: new Date().toISOString(),
};

describe("MessageBubble", () => {
  it("renders user message with right alignment", () => {
    render(<MessageBubble message={mockUserMessage} />);
    const bubble = screen.getByTestId(`message-bubble-${mockUserMessage.id}`);
    expect(bubble).toHaveClass("justify-end");
    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
  });

  it("renders assistant message with left alignment", () => {
    render(<MessageBubble message={mockAssistantMessage} />);
    const bubble = screen.getByTestId(`message-bubble-${mockAssistantMessage.id}`);
    expect(bubble).toHaveClass("justify-start");
  });

  it("renders text blocks", () => {
    render(<MessageBubble message={mockUserMessage} />);
    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
  });

  it("renders tool blocks with pre formatting", () => {
    render(<MessageBubble message={mockAssistantMessage} />);
    const pre = document.querySelector("pre");
    expect(pre).toBeInTheDocument();
    expect(pre?.textContent).toContain('"name": "search"');
  });

  it("renders error blocks with destructive color", () => {
    render(<MessageBubble message={mockErrorMessage} />);
    const errorText = screen.getByText("Something went wrong.");
    expect(errorText).toHaveClass("text-destructive");
  });

  it("renders multiple blocks", () => {
    render(<MessageBubble message={mockAssistantMessage} />);
    expect(screen.getByText("I can help with that.")).toBeInTheDocument();
    const pre = document.querySelector("pre");
    expect(pre?.textContent).toContain('"name": "search"');
  });
});
