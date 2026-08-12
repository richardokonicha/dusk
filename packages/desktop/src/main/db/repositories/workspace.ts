import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  workspaces,
  type Workspace,
  type NewWorkspace,
} from "../../../../../shared/dist/src/schema/index.js";

export class WorkspaceRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  async findAll(): Promise<Workspace[]> {
    return this.db.select().from(workspaces).orderBy(desc(workspaces.updatedAt)).all();
  }

  async findById(id: string): Promise<Workspace | undefined> {
    return this.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
  }

  async findByPath(path: string): Promise<Workspace | undefined> {
    return this.db.select().from(workspaces).where(eq(workspaces.path, path)).get();
  }

  async create(data: NewWorkspace): Promise<Workspace> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const [workspace] = await this.db
      .insert(workspaces)
      .values({
        ...data,
        id,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .returning();
    return workspace;
  }

  async update(id: string, data: Partial<NewWorkspace>): Promise<Workspace | undefined> {
    const [workspace] = await this.db
      .update(workspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    return workspace;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(workspaces).where(eq(workspaces.id, id)).run();
  }
}
