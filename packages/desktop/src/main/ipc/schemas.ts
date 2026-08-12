import { z } from "zod";

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullable(),
  status: z.enum(["inbox", "active", "waiting", "done"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueAt: z.string().datetime().nullable(),
  parentId: z.string().uuid().nullable(),
  tags: z.array(z.string()),
  projectId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable(),
  color: z.string().max(50).nullable(),
  parentId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().max(50).nullable(),
  createdAt: z.string().datetime(),
});

export const NoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  content: z.string().max(100000),
  taskId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PendingTaskSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  blockerType: z.string().max(200),
  description: z.string().max(5000).nullable(),
  resolvedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const StatSchema = z.object({
  date: z.string().datetime(),
  taskCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
});

export const PlatformInfoSchema = z.object({
  version: z.string(),
  platform: z.string(),
  arch: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Note = z.infer<typeof NoteSchema>;
export type PendingTask = z.infer<typeof PendingTaskSchema>;
export type Stat = z.infer<typeof StatSchema>;
export type PlatformInfo = z.infer<typeof PlatformInfoSchema>;

export const CreateTaskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullable(),
  status: z.enum(["inbox", "active", "waiting", "done"]).default("inbox"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  dueAt: z.string().datetime().nullable(),
  parentId: z.string().uuid().nullable(),
  tags: z.array(z.string()).default([]),
  projectId: z.string().uuid().nullable(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().required({ id: true });

export const CreateProjectSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable(),
  color: z.string().max(50).nullable(),
  parentId: z.string().uuid().nullable(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().required({ id: true });

export const CreateNoteSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  content: z.string().max(100000),
  taskId: z.string().uuid().nullable(),
});

export const UpdateNoteSchema = CreateNoteSchema.partial().required({ id: true });

export const PermissionsSchema = z.object({
  fileRead: z.boolean().default(true),
  fileWrite: z.boolean().default(false),
  fileDelete: z.boolean().default(false),
  networkOutbound: z.boolean().default(true),
  systemExecute: z.boolean().default(false),
});

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).nullable(),
  model: z.string().min(1),
  systemPrompt: z.string().max(50000).nullable(),
  temperature: z.number().min(0).max(2).nullable(),
  maxTokens: z.number().int().positive().max(100000).nullable(),
  topP: z.number().min(0).max(1).nullable(),
  tools: z.array(z.string()).nullable(),
  permissions: PermissionsSchema.default({
    fileRead: true,
    fileWrite: false,
    fileDelete: false,
    networkOutbound: true,
    systemExecute: false,
  }),
});

export const UpdateAgentSchema = CreateAgentSchema.partial();

export const CreateProviderSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["openai", "anthropic", "google", "ollama", "custom", "fugoku"]),
  apiKey: z.string().min(1).max(500),
  endpoint: z.string().url().nullable(),
  models: z.array(z.string()).nullable(),
  priority: z.number().int().min(1).max(100).nullable(),
  enabled: z.boolean().default(true),
});

export const UpdateProviderSchema = CreateProviderSchema.partial();

export const CreateConversationSchema = z.object({
  title: z.string().min(1).max(500).nullable(),
  workspaceId: z.string().uuid().nullable(),
  agentId: z.string().uuid().nullable(),
  model: z.string().min(1).nullable(),
});

export const UpdateConversationSchema = CreateConversationSchema.partial();

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(100000),
  agentId: z.string().uuid().nullable(),
  model: z.string().min(1).nullable(),
  stream: z.boolean().default(true),
});

export const FileReadSchema = z.object({
  path: z.string().min(1),
  encoding: z.string().default("utf-8"),
});

export const FileWriteSchema = z.object({
  path: z.string().min(1),
  content: z.union([z.string(), z.instanceof(Uint8Array)]),
  encoding: z.string().default("utf-8"),
});

export const FileListSchema = z.object({
  path: z.string().min(1).default("/"),
  recursive: z.boolean().default(false),
  maxDepth: z.number().int().positive().max(20).default(5),
});

export const OpenExternalSchema = z.object({
  url: z.string().url(),
  options: z.object({}).passthrough().optional(),
});

export const SystemHealthSchema = z.object({});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
export type CreateProviderInput = z.infer<typeof CreateProviderSchema>;
export type UpdateProviderInput = z.infer<typeof UpdateProviderSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type UpdateConversationInput = z.infer<typeof UpdateConversationSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type FileReadInput = z.infer<typeof FileReadSchema>;
export type FileWriteInput = z.infer<typeof FileWriteSchema>;
export type FileListInput = z.infer<typeof FileListSchema>;
export type OpenExternalInput = z.infer<typeof OpenExternalSchema>;
export type SystemHealthInput = z.infer<typeof SystemHealthSchema>;

export const SettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  language: z.string().max(10).default("en"),
  fontSize: z.number().min(10).max(24).default(14),
  sendOnEnter: z.enum(["enter", "shift+enter", "ctrl+enter"]).default("enter"),
  spellCheck: z.boolean().default(true),
  telemetry: z.boolean().default(false),
  autoUpdate: z.boolean().default(true),
});

export const GetSettingsSchema = z.object({});
export const SetSettingsSchema = SettingsSchema.partial();

export type Settings = z.infer<typeof SettingsSchema>;
export type GetSettingsInput = z.infer<typeof GetSettingsSchema>;
export type SetSettingsInput = z.infer<typeof SetSettingsSchema>;
