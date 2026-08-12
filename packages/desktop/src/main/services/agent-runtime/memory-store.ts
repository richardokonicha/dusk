import Database from 'better-sqlite3'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { AgentState, ConversationMessage, MemoryEntry } from "../../../../../shared/dist/src/types/agent.js"

export class MemoryStore {
  private shortTerm: Map<string, ConversationMessage[]> = new Map()
  private shortTermMaxMessages: number
  private db: Database.Database | null = null
  private dbPath?: string

  constructor(config?: { longTermDbPath?: string; shortTermMaxMessages?: number }) {
    this.shortTermMaxMessages = config?.shortTermMaxMessages ?? 100
    this.dbPath = config?.longTermDbPath
    if (this.dbPath) {
      this.initDatabase()
    }
  }

  private initDatabase(): void {
    if (!this.dbPath) return
    try {
      fs.mkdir(path.dirname(this.dbPath), { recursive: true })
      this.db = new Database(this.dbPath)
      this.db.pragma('journal_mode = WAL')

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS memories (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          metadata TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `)

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          messages TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `)
    } catch (error) {
      console.error('Failed to initialize memory database:', error)
      this.db = null
      this.dbPath = undefined
    }
  }

  async getMemory(key: string): Promise<string | null> {
    if (this.db) {
      try {
        const row = this.db.prepare('SELECT value FROM memories WHERE key = ?').get(key) as
          | { value: string }
          | undefined
        return row?.value ?? null
      } catch (error) {
        console.error(`Failed to get memory for key "${key}":`, error)
        return null
      }
    }
    return null
  }

  async setMemory(key: string, value: string): Promise<void> {
    const now = Date.now()
    if (this.db) {
      try {
        this.db
          .prepare(
            `INSERT INTO memories (key, value, metadata, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
          )
          .run(key, value, null, now, now)
      } catch (error) {
        console.error(`Failed to set memory for key "${key}":`, error)
      }
    }
  }

  async listMemories(): Promise<MemoryEntry[]> {
    if (this.db) {
      try {
        const rows = this.db.prepare('SELECT key, value, metadata, created_at, updated_at FROM memories').all() as
          Array<{
            key: string
            value: string
            metadata: string | null
            created_at: number
            updated_at: number
          }>
        return rows.map((row) => ({
          key: row.key,
          value: row.value,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      } catch (error) {
        console.error('Failed to list memories:', error)
        return []
      }
    }
    return []
  }

  async deleteMemory(key: string): Promise<void> {
    if (this.db) {
      try {
        this.db.prepare('DELETE FROM memories WHERE key = ?').run(key)
      } catch (error) {
        console.error(`Failed to delete memory for key "${key}":`, error)
      }
    }
  }

  async addMessage(
    conversationId: string,
    message: Omit<ConversationMessage, 'timestamp'> & { timestamp?: number }
  ): Promise<void> {
    const msg: ConversationMessage = {
      ...message,
      timestamp: message.timestamp ?? Date.now()
    }

    const history = this.shortTerm.get(conversationId) || []
    history.push(msg)
    if (history.length > this.shortTermMaxMessages) {
      history.splice(0, history.length - this.shortTermMaxMessages)
    }
    this.shortTerm.set(conversationId, history)

    if (this.db) {
      try {
        const now = Date.now()
        const existing = this.db.prepare('SELECT messages FROM conversations WHERE id = ?').get(conversationId) as
          | { messages: string }
          | undefined
        let messages: ConversationMessage[] = []
        if (existing) {
          try {
            messages = JSON.parse(existing.messages)
          } catch {
            messages = []
          }
        }
        messages.push(msg)
        if (messages.length > this.shortTermMaxMessages) {
          messages.splice(0, messages.length - this.shortTermMaxMessages)
        }
        this.db
          .prepare(
            `INSERT INTO conversations (id, messages, created_at, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET messages = excluded.messages, updated_at = excluded.updated_at`
          )
          .run(conversationId, JSON.stringify(messages), now, now)
      } catch (error) {
        console.error(`Failed to persist message for conversation "${conversationId}":`, error)
      }
    }
  }

  async addMessages(conversationId: string, messages: ConversationMessage[]): Promise<void> {
    for (const msg of messages) {
      await this.addMessage(conversationId, msg)
    }
  }

  async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    if (this.db) {
      try {
        const row = this.db.prepare('SELECT messages FROM conversations WHERE id = ?').get(conversationId) as
          | { messages: string }
          | undefined
        if (row) {
          try {
            return JSON.parse(row.messages)
          } catch {
            return []
          }
        }
      } catch (error) {
        console.error(`Failed to get conversation history for "${conversationId}":`, error)
      }
    }
    return this.shortTerm.get(conversationId) || []
  }

  async clearConversation(conversationId: string): Promise<void> {
    this.shortTerm.delete(conversationId)
    if (this.db) {
      try {
        this.db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId)
      } catch (error) {
        console.error(`Failed to clear conversation "${conversationId}":`, error)
      }
    }
  }

  async getAgentState(agentId: string): Promise<AgentState> {
    const key = `agent:${agentId}:state`
    const state = await this.getMemory(key)
    return (state as AgentState) || 'idle'
  }

  async setAgentState(agentId: string, state: AgentState): Promise<void> {
    const key = `agent:${agentId}:state`
    await this.setMemory(key, state)
  }

  close(): void {
    if (this.db) {
      try {
        this.db.close()
      } catch {
        // ignore close errors
      }
      this.db = null
    }
    this.shortTerm.clear()
  }
}
