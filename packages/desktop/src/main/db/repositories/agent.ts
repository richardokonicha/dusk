import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  agents,
  type Agent,
  type NewAgent,
} from "../../../../../shared/dist/src/schema/index.js";

export class AgentRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  async findAll(workspaceId?: string): Promise<Agent[]> {
    let query = this.db.select().from(agents);
    if (workspaceId !== undefined) {
      if (workspaceId === null) {
        query = (query as any).where(sql`${agents.workspaceId} IS NULL` as any);
      } else {
        query = (query as any).where(eq(agents.workspaceId, workspaceId as any));
      }
    }
    return query.orderBy(desc(agents.updatedAt)).all();
  }

  async findById(id: string): Promise<Agent | undefined> {
    return this.db.select().from(agents).where(eq(agents.id, id)).get();
  }

  async findByWorkspace(workspaceId: string | null): Promise<Agent[]> {
    if (workspaceId === null) {
      return this.db
        .select()
        .from(agents)
        .where(sql`${agents.workspaceId} IS NULL`)
        .orderBy(desc(agents.updatedAt))
        .all();
    }
    return this.db
      .select()
      .from(agents)
      .where(eq(agents.workspaceId, workspaceId))
      .orderBy(desc(agents.updatedAt))
      .all();
  }

  async findByType(type: string): Promise<Agent[]> {
    return this.db
      .select()
      .from(agents)
      .where(eq(agents.type, type as any))
      .orderBy(desc(agents.updatedAt))
      .all();
  }

  async create(data: NewAgent): Promise<Agent> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const [agent] = await this.db
      .insert(agents)
      .values({
        ...data,
        id,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .returning();
    return agent;
  }

  async update(id: string, data: Partial<NewAgent>): Promise<Agent | undefined> {
    const [agent] = await this.db
      .update(agents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();
    return agent;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(agents).where(eq(agents.id, id)).run();
  }
}
