import React from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import type { Workspace, Conversation, Message, Agent } from "@shared/types";

export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions): RenderResult {
  return render(<BrowserRouter>{ui}</BrowserRouter>, options);
}

export function createMockWorkspace(overrides?: Partial<Workspace>): Workspace {
  return {
    id: "workspace-1",
    name: "Test Workspace",
    description: "A test workspace",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockConversation(overrides?: Partial<Conversation>): Conversation {
  return {
    id: "conv-1",
    workspaceId: "workspace-1",
    title: "Test Conversation",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: null,
    ...overrides,
  };
}

export function createMockMessage(overrides?: Partial<Message>): Message {
  return {
    id: "msg-1",
    conversationId: "conv-1",
    role: "user",
    content: "Hello, world!",
    blocks: [
      {
        id: "block-1",
        messageId: "msg-1",
        type: "text",
        content: "Hello, world!",
      },
    ],
    createdAt: new Date().toISOString(),
    metadata: null,
    ...overrides,
  };
}

export function createMockAgent(overrides?: Partial<Agent>): Agent {
  return {
    id: "agent-1",
    name: "Test Agent",
    description: "A test agent",
    providerId: "provider-1",
    model: "gpt-4",
    systemPrompt: "You are a helpful assistant.",
    temperature: 0.7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
