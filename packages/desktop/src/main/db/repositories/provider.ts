import { eq, and, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  providers,
  type Provider,
  type NewProvider,
} from "../../../../../shared/dist/src/schema/index.js";

export class ProviderRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  async findAll(): Promise<Provider[]> {
    return this.db.select().from(providers).orderBy(asc(providers.name)).all();
  }

  async findById(id: string): Promise<Provider | undefined> {
    return this.db.select().from(providers).where(eq(providers.id, id as any)).get();
  }

  async findActive(): Promise<Provider[]> {
    return this.db
      .select()
      .from(providers)
      .where(eq(providers.isActive, true as any))
      .orderBy(asc(providers.name))
      .all();
  }

  async findByType(type: string): Promise<Provider[]> {
    return this.db
      .select()
      .from(providers)
      .where(eq(providers.type, type as any))
      .orderBy(asc(providers.name))
      .all();
  }

  async create(data: NewProvider): Promise<Provider> {
    const id = crypto.randomUUID();
    const [provider] = await this.db
      .insert(providers)
      .values({
        ...data,
        id,
        createdAt: new Date(),
      })
      .returning();
    return provider;
  }

  async update(id: string, data: Partial<NewProvider>): Promise<Provider | undefined> {
    const [provider] = await this.db
      .update(providers)
      .set(data)
      .where(eq(providers.id, id))
      .returning();
    return provider;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(providers).where(eq(providers.id, id)).run();
  }

  async setActive(id: string, isActive: boolean): Promise<Provider | undefined> {
    const [provider] = await this.db
      .update(providers)
      .set({ isActive })
      .where(eq(providers.id, id))
      .returning();
    return provider;
  }
}
