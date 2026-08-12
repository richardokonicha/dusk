import { eq, and, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  files,
  type File,
  type NewFile,
} from "../../../../../shared/dist/src/schema/index.js";

export class FileRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  async findAll(workspaceId?: string): Promise<File[]> {
    let query = this.db.select().from(files);
    if (workspaceId) {
      query = (query as any).where(eq(files.workspaceId, workspaceId as any));
    }
    return query.orderBy(desc(files.updatedAt)).all();
  }

  async findById(id: string): Promise<File | undefined> {
    return this.db.select().from(files).where(eq(files.id, id as any)).get();
  }

  async findByPath(workspaceId: string, path: string): Promise<File | undefined> {
    return this.db
      .select()
      .from(files)
      .where(and(eq(files.workspaceId, workspaceId as any), eq(files.path, path as any)))
      .get();
  }

  async findByWorkspace(workspaceId: string): Promise<File[]> {
    return this.db
      .select()
      .from(files)
      .where(eq(files.workspaceId, workspaceId as any))
      .orderBy(asc(files.path))
      .all();
  }

  async create(data: NewFile): Promise<File> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const [file] = await this.db
      .insert(files)
      .values({
        ...data,
        id,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .returning();
    return file;
  }

  async update(id: string, data: Partial<NewFile>): Promise<File | undefined> {
    const [file] = await this.db
      .update(files)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    return file;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(files).where(eq(files.id, id)).run();
  }

  async deleteByWorkspace(workspaceId: string): Promise<void> {
    await this.db.delete(files).where(eq(files.workspaceId, workspaceId)).run();
  }
}
