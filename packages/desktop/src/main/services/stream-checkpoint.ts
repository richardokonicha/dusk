import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { DatabaseService } from "./db";
import {
  messages,
  type Message,
  type NewMessage,
} from "../../../../shared/dist/src/schema/index.js";
import type { DrizzleDBSchema } from "../../../../shared/dist/src/types/db.js";

export interface StreamCheckpoint {
  streamId: string;
  messageId: string | null;
  conversationId: string;
  accumulatedContent: string;
  toolCalls: Record<string, unknown>[];
  createdAt: number;
  updatedAt: number;
  isComplete: boolean;
}

export interface CheckpointUpdate {
  accumulatedContent: string;
  toolCalls: Record<string, unknown>[];
}

export class StreamCheckpointService {
  private db: ReturnType<typeof drizzle> | null = null;
  private rawDb: Database.Database | null = null;

  constructor(db?: { drizzle: ReturnType<typeof drizzle>; raw: Database.Database }) {
    if (db) {
      this.db = db.drizzle
      this.rawDb = db.raw
    }
  }

  private getDb() {
    if (!this.db || !this.rawDb) {
      const dbService = DatabaseService.getInstance();
      this.db = dbService.drizzle;
      this.rawDb = dbService.raw;
    }
    return { drizzle: this.db, raw: this.rawDb! };
  }

  createStreamCheckpoint(
    conversationId: string,
    messageId: string
  ): StreamCheckpoint {
    const { raw } = this.getDb();
    const streamId = `stream_${randomUUID()}`;
    const now = Date.now();

    raw.prepare(
      `INSERT INTO messages (id, conversation_id, role, content, stream_id, checkpoint, is_complete, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      messageId,
      conversationId,
      "assistant",
      "",
      streamId,
      JSON.stringify({ accumulatedContent: "", toolCalls: [] }),
      0,
      now
    );

    return {
      streamId,
      messageId,
      conversationId,
      accumulatedContent: "",
      toolCalls: [],
      createdAt: now,
      updatedAt: now,
      isComplete: false,
    };
  }

  updateCheckpoint(
    streamId: string,
    update: CheckpointUpdate
  ): StreamCheckpoint | null {
    const { raw } = this.getDb();
    const existing = raw.prepare(
      `SELECT id, conversation_id, created_at FROM messages WHERE stream_id = ? AND is_complete = 0`
    ).get(streamId) as
      | { id: string; conversation_id: string; created_at: number }
      | undefined;

    if (!existing) return null;

    const now = Date.now();
    const checkpoint: Record<string, unknown> = {
      accumulatedContent: update.accumulatedContent,
      toolCalls: update.toolCalls,
    };

    raw.prepare(
      `UPDATE messages SET content = ?, checkpoint = ?, updated_at = ? WHERE stream_id = ?`
    ).run(
      update.accumulatedContent,
      JSON.stringify(checkpoint),
      now,
      streamId
    );

    return {
      streamId,
      messageId: existing.id,
      conversationId: existing.conversation_id,
      accumulatedContent: update.accumulatedContent,
      toolCalls: update.toolCalls,
      createdAt: existing.created_at,
      updatedAt: now,
      isComplete: false,
    };
  }

  getCheckpoint(streamId: string): StreamCheckpoint | null {
    const { raw } = this.getDb();
    const row = raw.prepare(
      `SELECT id, conversation_id, content, checkpoint, created_at, updated_at, is_complete
       FROM messages WHERE stream_id = ?`
    ).get(streamId) as
      | {
          id: string;
          conversation_id: string;
          content: string;
          checkpoint: string;
          created_at: number;
          updated_at: number;
          is_complete: number;
        }
      | undefined;

    if (!row) return null;

    const checkpoint = JSON.parse(row.checkpoint) as {
      accumulatedContent: string;
      toolCalls: Record<string, unknown>[];
    };

    return {
      streamId,
      messageId: row.id,
      conversationId: row.conversation_id,
      accumulatedContent:
        checkpoint.accumulatedContent ?? row.content ?? "",
      toolCalls: checkpoint.toolCalls ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isComplete: Boolean(row.is_complete),
    };
  }

  completeStream(streamId: string): boolean {
    const { raw } = this.getDb();
    const result = raw.prepare(
      `UPDATE messages SET is_complete = 1, updated_at = ? WHERE stream_id = ?`
    ).run(Date.now(), streamId);

    return result.changes > 0;
  }

  resumeStream(streamId: string): StreamCheckpoint | null {
    return this.getCheckpoint(streamId);
  }

  findLatestIncompleteStream(
    conversationId: string
  ): StreamCheckpoint | null {
    const { raw } = this.getDb();
    const row = raw.prepare(
      `SELECT id, stream_id, content, checkpoint, created_at, updated_at
       FROM messages
       WHERE conversation_id = ? AND is_complete = 0 AND stream_id IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT 1`
    ).get(conversationId) as
      | {
          id: string;
          stream_id: string;
          content: string;
          checkpoint: string;
          created_at: number;
          updated_at: number;
        }
      | undefined;

    if (!row) return null;

    const checkpoint = JSON.parse(row.checkpoint) as {
      accumulatedContent: string;
      toolCalls: Record<string, unknown>[];
    };

    return {
      streamId: row.stream_id,
      messageId: row.id,
      conversationId,
      accumulatedContent:
        checkpoint.accumulatedContent ?? row.content ?? "",
      toolCalls: checkpoint.toolCalls ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isComplete: false,
    };
  }
}
