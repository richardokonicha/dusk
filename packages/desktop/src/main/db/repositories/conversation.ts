import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  conversations,
  type Conversation,
  type NewConversation,
} from "../../../../../shared/dist/src/schema/index.js";

export class ConversationRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  async findAll(workspaceId?: string): Promise<Conversation[]> {
    let query = this.db.select().from(conversations);
    if (workspaceId) {
      query = (query as any).where(eq(conversations.workspaceId, workspaceId as any));
    }
    return query.orderBy(desc(conversations.updatedAt)).all();
  }

  async findById(id: string): Promise<Conversation | undefined> {
    return this.db.select().from(conversations).where(eq(conversations.id, id as any)).get();
  }

  async findByWorkspace(workspaceId: string): Promise<Conversation[]> {
    return this.db
      .select()
      .from(conversations)
      .where(eq(conversations.workspaceId, workspaceId as any))
      .orderBy(desc(conversations.updatedAt))
      .all();
  }

  async create(data: NewConversation): Promise<Conversation> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const [conversation] = await this.db
      .insert(conversations)
      .values({
        ...data,
        id,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .returning();
    return conversation;
  }

  async update(id: string, data: Partial<NewConversation>): Promise<Conversation | undefined> {
    const [conversation] = await this.db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(conversations).where(eq(conversations.id, id)).run();
  }
}
