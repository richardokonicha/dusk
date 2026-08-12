import { z } from "zod";

export const workspaceListSchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

export const workspaceCreateSchema = z.object({
  name: z.string().min(1).max(255),
  path: z.string().min(1).max(4096),
});

export const workspaceGetSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const workspaceUpdateSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  path: z.string().min(1).max(4096).optional(),
});

export const workspaceDeleteSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const conversationListSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const conversationCreateSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
});

export const conversationGetSchema = z.object({
  conversationId: z.string().uuid(),
});

export const conversationDeleteSchema = z.object({
  conversationId: z.string().uuid(),
});

export const messageSendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]).default("user"),
});

export const messageHistorySchema = z.object({
  conversationId: z.string().uuid(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0),
});

export const agentListSchema = z.object({});

export const agentCreateSchema = z.object({
  name: z.string().min(1).max(255),
  provider: z.string().min(1),
  model: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

export const agentGetSchema = z.object({
  agentId: z.string().uuid(),
});

export const agentUpdateSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  provider: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
});

export const agentDeleteSchema = z.object({
  agentId: z.string().uuid(),
});

export const agentInvokeSchema = z.object({
  agentId: z.string().uuid(),
  input: z.unknown(),
  options: z.record(z.unknown()).optional(),
});

export const agentStopSchema = z.object({
  agentId: z.string().uuid(),
});

export const fileListSchema = z.object({
  workspaceId: z.string().uuid(),
  path: z.string().default("/"),
});

export const fileReadSchema = z.object({
  workspaceId: z.string().uuid(),
  path: z.string().min(1),
});

export const fileWriteSchema = z.object({
  workspaceId: z.string().uuid(),
  path: z.string().min(1),
  content: z.string(),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
});

export const fileDeleteSchema = z.object({
  workspaceId: z.string().uuid(),
  path: z.string().min(1),
});

export const fileCreateDirSchema = z.object({
  workspaceId: z.string().uuid(),
  path: z.string().min(1),
});

export const fileWatchSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const artifactListSchema = z.object({
  workspaceId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
});

export const artifactGetSchema = z.object({
  artifactId: z.string().uuid(),
});

export const artifactSaveSchema = z.object({
  workspaceId: z.string().uuid(),
  agentId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.string(),
  conversationId: z.string().uuid().optional(),
});

export const artifactDeleteSchema = z.object({
  artifactId: z.string().uuid(),
});

export const artifactLinkSchema = z.object({
  artifactId: z.string().uuid(),
  conversationId: z.string().uuid(),
});

export const workspaceExportSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const workspaceImportSchema = z.object({
  data: z.instanceof(Uint8Array),
});

export const providerListSchema = z.object({});

export const providerAddSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["openai", "anthropic", "ollama", "custom"]),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  models: z.array(z.string()).optional(),
});

export const providerTestSchema = z.object({
  providerId: z.string().uuid(),
});

export const providerGetModelsSchema = z.object({
  providerId: z.string().uuid(),
});

export const settingsGetSchema = z.object({
  key: z.string().min(1),
});

export const settingsSetSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const systemOpenPathSchema = z.object({
  path: z.string().min(1),
});

export const messageStreamSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]).default("user"),
  checkpoint: z.record(z.unknown()).optional(),
});

export const streamCheckpointSchema = z.object({
  streamId: z.string().uuid(),
  position: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  checkpoint: z.record(z.unknown()),
});

export type StreamCheckpoint = z.infer<typeof streamCheckpointSchema>;

export const onboardingStatusSchema = z.object({});
export const onboardingCompleteSchema = z.object({});
export const onboardingSkipSchema = z.object({});
export const onboardingSetStepSchema = z.object({
  step: z.enum(["welcome", "provider", "workspace", "complete"]),
});
export const onboardingIsFirstRunSchema = z.object({});
export const onboardingResetSchema = z.object({});

export const providerTestConnectionSchema = z.object({
  type: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
});

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  path: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const conversationSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.number(),
});

export const agentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  provider: z.string(),
  model: z.string(),
  config: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const fileSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  path: z.string(),
  name: z.string(),
  size: z.number(),
  mtime: z.number(),
});

export const providerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(["openai", "anthropic", "ollama", "custom"]),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  models: z.array(z.string()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const systemInfoSchema = z.object({});

export const systemInfoSchemaResponse = z.object({
  platform: z.string(),
  arch: z.string(),
  version: z.string(),
  electronVersion: z.string(),
  nodeVersion: z.string(),
  chromeVersion: z.string(),
});

export const jobListSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]).optional(),
});

export const jobGetSchema = z.object({
  jobId: z.string().uuid(),
});

export const jobCancelSchema = z.object({
  jobId: z.string().uuid(),
});

export const jobRetrySchema = z.object({
  jobId: z.string().uuid(),
});

export const jobSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).nullable(),
  error: z.string().nullable(),
  startedAt: z.number().nullable(),
  completedAt: z.number().nullable(),
  createdAt: z.number(),
});

export type Workspace = z.infer<typeof workspaceSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Agent = z.infer<typeof agentSchema>;
export type FileEntry = z.infer<typeof fileSchema>;
export type Provider = z.infer<typeof providerSchema>;
export type SystemInfo = z.infer<typeof systemInfoSchemaResponse>;
export type Job = z.infer<typeof jobSchema>;
