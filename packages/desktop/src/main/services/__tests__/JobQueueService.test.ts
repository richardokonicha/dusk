import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import { JobQueueService } from "../job-queue";

vi.mock("@/services/db", () => {
  const mockDbService = {
    initialized: true,
    drizzle: {},
    raw: {
      prepare: vi.fn().mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 1 }),
        get: vi.fn(),
      }),
    },
  };
  return {
    DatabaseService: {
      getInstance: vi.fn().mockReturnValue(mockDbService),
    },
  };
});

interface MockJob {
  id: string;
  agentId: string;
  workspaceId: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
}

const mockJobs: MockJob[] = [];

const mockJobRepository = () => ({
  create: vi.fn(async (input: { agentId: string; workspaceId: string; input: Record<string, unknown>; status: string }) => {
    const job: MockJob = {
      id: `job-${mockJobs.length + 1}`,
      agentId: input.agentId,
      workspaceId: input.workspaceId,
      status: input.status,
      input: input.input,
      output: null,
      error: null,
    };
    mockJobs.push(job);
    return job;
  }),
  findByStatus: vi.fn(async (status: string) => {
    return mockJobs.filter((j) => j.status === status);
  }),
  findById: vi.fn(async (id: string) => {
    return mockJobs.find((j) => j.id === id) || null;
  }),
  update: vi.fn(async (id: string, updates: Partial<MockJob>) => {
    const job = mockJobs.find((j) => j.id === id);
    if (job) {
      Object.assign(job, updates);
      return job;
    }
    return null;
  }),
  findAll: vi.fn(async () => {
    return [...mockJobs];
  }),
});

vi.mock("@/db/repositories/job", () => ({
  JobRepository: vi.fn().mockImplementation(() => mockJobRepository()),
}));

describe("JobQueueService", () => {
  let service: JobQueueService;

  beforeEach(() => {
    mockJobs.length = 0;
    service = new JobQueueService();
  });

  afterEach(async () => {
    if (service["processing"]) {
      await service.stop();
    }
  });

  it("emits job:queued event when enqueueing", async () => {
    const queuedHandler = vi.fn();
    service.on("job:queued", queuedHandler);
    await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    expect(queuedHandler).toHaveBeenCalled();
  });

  it("returns job from enqueue", async () => {
    const job = await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    expect(job).toBeDefined();
    expect(job.id).toBe("job-1");
  });

  it("dequeues a job", async () => {
    await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    const job = await service.dequeue();
    expect(job).toBeDefined();
    expect(job?.status).toBe("running");
  });

  it("returns null when no jobs to dequeue", async () => {
    const job = await service.dequeue();
    expect(job).toBeNull();
  });

  it("completes a job", async () => {
    const enqueued = await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    const completed = await service.complete(enqueued.id, { result: "success" });
    expect(completed).toBeDefined();
    expect(completed?.status).toBe("completed");
  });

  it("emits job:completed event", async () => {
    const completedHandler = vi.fn();
    service.on("job:completed", completedHandler);
    const enqueued = await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    await service.complete(enqueued.id, { result: "success" });
    expect(completedHandler).toHaveBeenCalled();
  });

  it("fails a job", async () => {
    const enqueued = await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    const failed = await service.fail(enqueued.id, "Error message");
    expect(failed).toBeDefined();
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toBe("Error message");
  });

  it("emits job:failed event", async () => {
    const failedHandler = vi.fn();
    service.on("job:failed", failedHandler);
    const enqueued = await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    await service.fail(enqueued.id, "Error");
    expect(failedHandler).toHaveBeenCalled();
  });

  it("cancels a queued job", async () => {
    const enqueued = await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    const cancelled = await service.cancel(enqueued.id);
    expect(cancelled).toBeDefined();
    expect(cancelled?.status).toBe("cancelled");
  });

  it("cancels a running job and stops agent", async () => {
    const mockAgent = {
      invoke: vi.fn(),
      stop: vi.fn(),
    };
    service.setAgentRuntime({
      getAgent: vi.fn().mockReturnValue(mockAgent),
    } as any);
    const enqueued = await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    await service.dequeue();
    const cancelled = await service.cancel(enqueued.id);
    expect(cancelled?.status).toBe("cancelled");
  });

  it("cannot cancel completed job", async () => {
    const enqueued = await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    await service.complete(enqueued.id, {});
    const cancelled = await service.cancel(enqueued.id);
    expect(cancelled?.status).toBe("completed");
  });

  it("gets job by id", async () => {
    const enqueued = await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    const job = await service.getJob(enqueued.id);
    expect(job).toBeDefined();
    expect(job?.id).toBe(enqueued.id);
  });

  it("lists jobs", async () => {
    await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    const jobs = await service.listJobs();
    expect(jobs).toBeDefined();
    expect(Array.isArray(jobs)).toBe(true);
  });

  it("retries failed job", async () => {
    const enqueued = await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    await service.fail(enqueued.id, "Error");
    const retried = await service.retryJob(enqueued.id);
    expect(retried).toBeDefined();
    expect(retried?.status).toBe("queued");
  });

  it("cannot retry non-failed job", async () => {
    const enqueued = await service.enqueue({ agentId: "agent-1", workspaceId: "ws-1", input: {} });
    const retried = await service.retryJob(enqueued.id);
    expect(retried).toBeNull();
  });

  it("starts processing loop", () => {
    service.start();
    expect(service["processing"]).toBe(true);
  });

  it("does not start processing twice", () => {
    service.start();
    service.start();
    expect(service["processing"]).toBe(true);
  });

  it("sets agent runtime", () => {
    const runtime = { getAgent: vi.fn() } as any;
    service.setAgentRuntime(runtime);
    expect(service["agentRuntime"]).toBe(runtime);
  });
});
