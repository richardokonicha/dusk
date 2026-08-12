import { describe, it, expect } from "vitest";
import type { Workspace, Conversation, Message, Agent } from "@shared/types";

describe("Shared Types", () => {
  describe("Workspace", () => {
    it("can be constructed with required fields", () => {
      const workspace: Workspace = {
        id: "ws-1",
        name: "Test Workspace",
        description: "Description",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      expect(workspace.id).toBe("ws-1");
      expect(workspace.name).toBe("Test Workspace");
    });
  });

  describe("Conversation", () => {
    it("can be constructed with required fields", () => {
      const conversation: Conversation = {
        id: "conv-1",
        workspaceId: "ws-1",
        title: "Test Chat",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        metadata: null,
      };
      expect(conversation.workspaceId).toBe("ws-1");
    });
  });

  describe("Message", () => {
    it("can be constructed with required fields", () => {
      const message: Message = {
        id: "msg-1",
        conversationId: "conv-1",
        role: "user",
        content: "Hi",
        blocks: [{ id: "b1", messageId: "msg-1", type: "text", content: "Hi" }],
        createdAt: "2024-01-01T00:00:00Z",
        metadata: null,
      };
      expect(message.role).toBe("user");
      expect(message.blocks).toHaveLength(1);
    });
  });

  describe("Agent", () => {
    it("can be constructed with required fields", () => {
      const agent: Agent = {
        id: "agent-1",
        name: "Test Agent",
        description: "A test agent",
        providerId: "p1",
        model: "gpt-4",
        systemPrompt: "You are helpful.",
        temperature: 0.7,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      expect(agent.model).toBe("gpt-4");
    });
  });
});
