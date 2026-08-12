import { EventEmitter } from "node:events";
import { DatabaseService } from "./db";
import { JobRepository } from "../db/repositories/job";
import type { Job } from "../../../../shared/dist/src/types/db.js";

export interface JobEnqueueInput {
  agentId: string;
  workspaceId: string;
  input: Record<string, unknown>;
}

export interface JobResult {
  type: "queued" | "running" | "completed" | "failed" | "cancelled";
  job: Job;
}

export type JobEventType = JobResult["type"];

export interface AgentRuntimeLike {
  getAgent(id: string): { invoke(input: { message: string; metadata?: Record<string, unknown> }): Promise<unknown>; stop(): void } | undefined;
}

export class JobQueueService extends EventEmitter {
  private jobRepository: JobRepository;
  private agentRuntime: AgentRuntimeLike | null = null;
  private processing = false;
  private processingPromise: Promise<void> | null = null;
  private runningJobs: Map<string, { promise: Promise<void> }> = new Map();

  constructor() {
    super();
    const dbService = DatabaseService.getInstance();
    this.jobRepository = new JobRepository(dbService.drizzle);
  }

  setAgentRuntime(runtime: AgentRuntimeLike): void {
    this.agentRuntime = runtime;
  }

  async enqueue(input: JobEnqueueInput): Promise<Job> {
    const job = await this.jobRepository.create({
      id: crypto.randomUUID(),
      agentId: input.agentId,
      workspaceId: input.workspaceId,
      input: input.input,
      status: "queued",
      createdAt: new Date(),
    });
    this.emit("job:queued", { type: "queued", job: job as Job });
    return job;
  }

  async dequeue(): Promise<Job | null> {
    const queuedJobs = await this.jobRepository.findByStatus("queued");
    if (queuedJobs.length === 0) return null;

    const job = queuedJobs[0];
    const updated = await this.jobRepository.update(job.id, { status: "running" });
    if (updated) {
      this.emit("job:running", { type: "running", job: updated as Job });
    }
    return updated || null;
  }

  async complete(jobId: string, result: Record<string, unknown>): Promise<Job | null> {
    const job = await this.jobRepository.update(jobId, { status: "completed", output: result });
    if (job) {
      this.runningJobs.delete(jobId);
      this.emit("job:completed", { type: "completed", job: job as Job });
    }
    return job || null;
  }

  async fail(jobId: string, error: string): Promise<Job | null> {
    const job = await this.jobRepository.update(jobId, { status: "failed", error });
    if (job) {
      this.runningJobs.delete(jobId);
      this.emit("job:failed", { type: "failed", job: job as Job });
    }
    return job || null;
  }

  async cancel(jobId: string): Promise<Job | null> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) return null;
    if (!["queued", "running"].includes(job.status)) {
      return job;
    }

    if (job.status === "running") {
      const agent = this.agentRuntime?.getAgent(job.agentId);
      if (agent) {
        agent.stop();
      }
    }

    const updated = await this.jobRepository.update(jobId, { status: "cancelled" });
    if (updated) {
      this.runningJobs.delete(jobId);
      this.emit("job:cancelled", { type: "cancelled", job: updated as Job });
    }
    return updated || null;
  }

  async getJob(jobId: string): Promise<Job | null> {
    const job = await this.jobRepository.findById(jobId);
    return job || null as Job | null;
  }

  async listJobs(workspaceId?: string, agentId?: string): Promise<Job[]> {
    return this.jobRepository.findAll(workspaceId, agentId);
  }

  async retryJob(jobId: string): Promise<Job | null> {
    const job = await this.jobRepository.findById(jobId);
    if (!job || job.status !== "failed") return null;

    const updated = await this.jobRepository.update(jobId, {
      status: "queued",
      output: null,
      error: null,
    });
    if (updated) {
      this.emit("job:queued", { type: "queued", job: updated as Job });
    }
    return updated || null;
  }

  start(): void {
    if (this.processing) return;
    this.processing = true;
    this.processingPromise = this._processLoop();
  }

  async stop(): Promise<void> {
    this.processing = false;
    for (const [jobId] of this.runningJobs) {
      try {
        await this.cancel(jobId);
      } catch {
        // ignore cancellation errors
      }
    }
    this.runningJobs.clear();
    if (this.processingPromise) {
      await this.processingPromise;
    }
  }

  private async _processLoop(): Promise<void> {
    while (this.processing) {
      try {
        const job = await this.dequeue();
        if (!job) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        if (!this.agentRuntime) {
          await this.fail(job.id, "Agent runtime not configured");
          continue;
        }

        const executionPromise = this._executeJob(job);
        this.runningJobs.set(job.id, { promise: executionPromise });

        try {
          await executionPromise;
        } catch (error) {
          await this.fail(job.id, error instanceof Error ? error.message : "Job execution failed");
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async _executeJob(job: Job): Promise<void> {
    const agent = this.agentRuntime?.getAgent(job.agentId) || this.agentRuntime?.getAgent("default-task");
    if (!agent) {
      throw new Error(`Agent ${job.agentId} not found`);
    }

    const input = {
      message: JSON.stringify(job.input),
      metadata: { jobId: job.id },
    };

    const result = await agent.invoke(input);

    await this.complete(job.id, {
      conversationId: (result as { conversationId: string }).conversationId,
      messages: (result as { messages: unknown[] }).messages,
      artifacts: (result as { artifacts: unknown[] }).artifacts,
      usage: (result as { usage?: unknown }).usage,
    });
  }
}
