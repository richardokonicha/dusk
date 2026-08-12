import { eq, and, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  messages,
  type Message,
  type NewMessage,
} from "../../../../../shared/dist/src/schema/index.js";

export class MessageRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  async findAll(conversationId: string): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .all();
  }

  async findById(id: string): Promise<Message | undefined> {
    return this.db.select().from(messages).where(eq(messages.id, id)).get();
  }

  async create(data: NewMessage): Promise<Message> {
    const id = crypto.randomUUID();
    const [message] = await this.db
      .insert(messages)
      .values({
        ...data,
        id,
        createdAt: new Date(),
      })
      .returning();
    return message;
  }

  async createMany(data: NewMessage[]): Promise<Message[]> {
    const now = Date.now();
    const values = data.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date(now),
    }));
    return this.db.insert(messages).values(values).returning();
  }

  async update(id: string, data: Partial<NewMessage>): Promise<Message | undefined> {
    const [message] = await this.db
      .update(messages)
      .set(data)
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(messages).where(eq(messages.id, id)).run();
  }

  async deleteByConversation(conversationId: string): Promise<void> {
    await this.db.delete(messages).where(eq(messages.conversationId, conversationId)).run();
  }
}
