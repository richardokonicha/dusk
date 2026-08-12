import { eq, and, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  jobs,
  type Job,
  type NewJob,
} from "../../../../../shared/dist/src/schema/index.js";

export class JobRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  async findAll(workspaceId?: string, agentId?: string): Promise<Job[]> {
    const conditions: any[] = [];
    if (workspaceId) conditions.push(eq(jobs.workspaceId, workspaceId as any));
    if (agentId) conditions.push(eq(jobs.agentId, agentId as any));

    let query = this.db.select().from(jobs);
    if (conditions.length > 0) {
      query = (query as any).where(and(...conditions));
    }
    return query.orderBy(desc(jobs.createdAt)).all();
  }

  async findById(id: string): Promise<Job | undefined> {
    return this.db.select().from(jobs).where(eq(jobs.id, id as any)).get();
  }

  async findByStatus(status: string): Promise<Job[]> {
    return this.db
      .select()
      .from(jobs)
      .where(eq(jobs.status, status as any))
      .orderBy(asc(jobs.createdAt))
      .all();
  }

  async create(data: NewJob): Promise<Job> {
    const id = crypto.randomUUID();
    const [job] = await this.db
      .insert(jobs)
      .values({
        ...data,
        id,
        createdAt: new Date(),
      })
      .returning();
    return job;
  }

  async update(id: string, data: Partial<NewJob>): Promise<Job | undefined> {
    const updates: Record<string, unknown> = { ...data };
    if (data.status === "running" && !data.startedAt) {
      updates.startedAt = new Date();
    }
    if (data.status && ["completed", "failed", "cancelled"].includes(data.status) && !data.completedAt) {
      updates.completedAt = new Date();
    }

    const [job] = await this.db
      .update(jobs)
      .set(updates)
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(jobs).where(eq(jobs.id, id)).run();
  }

  async deleteByWorkspace(workspaceId: string): Promise<void> {
    await this.db.delete(jobs).where(eq(jobs.workspaceId, workspaceId)).run();
  }
}
