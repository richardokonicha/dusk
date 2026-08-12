import { describe, it, expect, vi, beforeEach } from "vitest";
import { StreamCheckpointService } from "../stream-checkpoint";

interface MockRow {
  id: string;
  conversation_id: string;
  created_at: number;
  content: string;
  checkpoint: string;
  updated_at: number;
  is_complete: number;
  stream_id?: string;
}

const mockDb: {
  messages: MockRow[];
} = {
  messages: [],
};

vi.mock("@/services/db", () => {
  return {
    DatabaseService: {
      getInstance: vi.fn().mockReturnValue({
        drizzle: {},
        raw: {
          prepare: vi.fn().mockImplementation((sql: string) => {
            const lowerSql = sql.toLowerCase();
            if (lowerSql.includes("insert into messages")) {
              return {
                run: vi.fn((...args: unknown[]) => {
                  const [, conversationId, , , streamId, checkpoint, isComplete, createdAt] = args as [
                    string,
                    string,
                    string,
                    string,
                    string,
                    string,
                    number,
                    number
                  ];
                  const row: MockRow = {
                    id: (args[0] as string) || `msg-${Date.now()}`,
                    conversation_id: conversationId,
                    created_at: createdAt,
                    content: "",
                    checkpoint,
                    updated_at: createdAt,
                    is_complete: isComplete,
                    stream_id: streamId,
                  };
                  mockDb.messages.push(row);
                  return { changes: 1 };
                }),
              };
            }
            if (lowerSql.includes("update messages set content")) {
              return {
                run: vi.fn((...args: unknown[]) => {
                  const [content, checkpoint, updatedAt, streamId] = args as [
                    string,
                    string,
                    number,
                    string
                  ];
                  const row = mockDb.messages.find((m) => m.stream_id === streamId && m.is_complete === 0);
                  if (row) {
                    row.content = content;
                    row.checkpoint = checkpoint;
                    row.updated_at = updatedAt;
                  }
                  return { changes: row ? 1 : 0 };
                }),
              };
            }
            if (lowerSql.includes("select") && lowerSql.includes("where stream_id = ?")) {
              return {
                get: vi.fn((streamId: string) => {
                  return mockDb.messages.find((m) => m.stream_id === streamId) || undefined;
                }),
              };
            }
            if (lowerSql.includes("select") && lowerSql.includes("is_complete = 0") && lowerSql.includes("stream_id is not null")) {
              return {
                get: vi.fn((conversationId: string) => {
                  const rows = mockDb.messages
                    .filter((m) => m.conversation_id === conversationId && m.is_complete === 0 && m.stream_id)
                    .sort((a, b) => b.updated_at - a.updated_at);
                  return rows[0] || undefined;
                }),
              };
            }
            if (lowerSql.includes("update messages set is_complete = 1")) {
              return {
                run: vi.fn((updatedAt: number, streamId: string) => {
                  const row = mockDb.messages.find((m) => m.stream_id === streamId && m.is_complete === 0);
                  if (row) {
                    row.is_complete = 1;
                    row.updated_at = updatedAt;
                  }
                  return { changes: row ? 1 : 0 };
                }),
              };
            }
            return {
              run: vi.fn().mockReturnValue({ changes: 0 }),
              get: vi.fn().mockReturnValue(undefined),
            };
          }),
        },
      }),
    },
  };
});

describe("StreamCheckpointService", () => {
  let service: StreamCheckpointService;

  beforeEach(() => {
    mockDb.messages = [];
    service = new StreamCheckpointService();
  });

  describe("createStreamCheckpoint", () => {
    it("creates a new stream checkpoint", () => {
      const result = service.createStreamCheckpoint("conv-1", "msg-1");
      expect(result).toBeDefined();
      expect(result.conversationId).toBe("conv-1");
      expect(result.messageId).toBe("msg-1");
      expect(result.accumulatedContent).toBe("");
      expect(result.toolCalls).toEqual([]);
      expect(result.isComplete).toBe(false);
      expect(result.streamId).toMatch(/^stream_/);
    });

    it("generates unique stream IDs", () => {
      const cp1 = service.createStreamCheckpoint("conv-1", "msg-1");
      const cp2 = service.createStreamCheckpoint("conv-1", "msg-2");
      expect(cp1.streamId).not.toBe(cp2.streamId);
    });

    it("sets timestamps on creation", () => {
      const result = service.createStreamCheckpoint("conv-1", "msg-1");
      expect(result.createdAt).toBeGreaterThan(0);
      expect(result.updatedAt).toBeGreaterThan(0);
    });
  });

  describe("updateCheckpoint", () => {
    it("updates existing checkpoint", () => {
      const checkpoint = service.createStreamCheckpoint("conv-1", "msg-1");
      const updated = service.updateCheckpoint(checkpoint.streamId, {
        accumulatedContent: "Hello",
        toolCalls: [],
      });
      expect(updated).toBeDefined();
      expect(updated?.accumulatedContent).toBe("Hello");
    });

    it("returns null for non-existent stream", () => {
      const result = service.updateCheckpoint("non-existent", {
        accumulatedContent: "Hello",
        toolCalls: [],
      });
      expect(result).toBeNull();
    });
  });

  describe("getCheckpoint", () => {
    it("returns null for non-existent stream", () => {
      const result = service.getCheckpoint("non-existent");
      expect(result).toBeNull();
    });

    it("returns checkpoint with updated timestamp", () => {
      const checkpoint = service.createStreamCheckpoint("conv-1", "msg-1");
      const result = service.getCheckpoint(checkpoint.streamId);
      expect(result).toBeDefined();
      expect(result?.streamId).toBe(checkpoint.streamId);
    });
  });

  describe("completeStream", () => {
    it("marks stream as complete", () => {
      const checkpoint = service.createStreamCheckpoint("conv-1", "msg-1");
      const result = service.completeStream(checkpoint.streamId);
      expect(result).toBe(true);
    });

    it("returns false for non-existent stream", () => {
      const result = service.completeStream("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("resumeStream", () => {
    it("resumes stream by getting checkpoint", () => {
      const checkpoint = service.createStreamCheckpoint("conv-1", "msg-1");
      const result = service.resumeStream(checkpoint.streamId);
      expect(result).toBeDefined();
      expect(result?.streamId).toBe(checkpoint.streamId);
    });

    it("returns null for non-existent stream", () => {
      const result = service.resumeStream("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("findLatestIncompleteStream", () => {
    it("returns null when no incomplete streams exist", () => {
      const result = service.findLatestIncompleteStream("conv-1");
      expect(result).toBeNull();
    });
  });
});
