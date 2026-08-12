export const MCP_PERMISSIONS = {
  FILE_READ: "file:read",
  FILE_WRITE: "file:write",
  FILE_DELETE: "file:delete",
  NETWORK_OUTBOUND: "network:outbound",
  NETWORK_INBOUND: "network:inbound",
  SYSTEM_EXECUTE: "system:execute",
  AGENT_CONTROL: "agent:control",
} as const;

export type McpPermission = (typeof MCP_PERMISSIONS)[keyof typeof MCP_PERMISSIONS];

export interface McpServerConfig {
  id: string;
  name: string;
  url: string;
  transport: "stdio" | "sse" | "streamable-http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
  approvedAt?: string;
  approvedBy?: string;
  permissions: McpPermission[];
  allowedTools?: string[];
  blockedTools?: string[];
  workspaceScoped: boolean;
}

export interface McpToolCall {
  serverId: string;
  toolName: string;
  params: Record<string, unknown>;
}

export interface McpAuditEntry {
  id: string;
  timestamp: string;
  serverId: string;
  serverName: string;
  tool: string;
  params: Record<string, unknown>;
  result: "success" | "error" | "denied";
  error?: string;
  workspaceId: string;
  durationMs: number;
}

export interface McpTrustPolicy {
  requireApproval: boolean;
  defaultPermissions: McpPermission[];
  denyNetworkByDefault: boolean;
  denyFileWriteByDefault: boolean;
  denySystemExecuteByDefault: boolean;
  auditAllCalls: boolean;
  maxConcurrentCalls: number;
  callTimeoutMs: number;
}

export const DEFAULT_MCP_TRUST_POLICY: McpTrustPolicy = {
  requireApproval: true,
  defaultPermissions: [MCP_PERMISSIONS.FILE_READ],
  denyNetworkByDefault: true,
  denyFileWriteByDefault: true,
  denySystemExecuteByDefault: true,
  auditAllCalls: true,
  maxConcurrentCalls: 4,
  callTimeoutMs: 60000,
};

export function filterPermissions(
  requested: McpPermission[],
  policy: McpTrustPolicy
): { granted: McpPermission[]; denied: McpPermission[] } {
  const granted: McpPermission[] = [];
  const denied: McpPermission[] = [];

  for (const perm of requested) {
    if (policy.defaultPermissions.includes(perm)) {
      granted.push(perm);
    } else {
      denied.push(perm);
    }
  }

  return { granted, denied };
}

export function hasPermission(
  server: McpServerConfig,
  permission: McpPermission
): boolean {
  return server.permissions.includes(permission);
}

export function canCallTool(
  server: McpServerConfig,
  toolName: string,
  policy: McpTrustPolicy
): boolean {
  if (server.blockedTools?.includes(toolName)) {
    return false;
  }

  if (server.allowedTools && server.allowedTools.length > 0) {
    return server.allowedTools.includes(toolName);
  }

  return true;
}

export function sanitizeAuditParams(
  params: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ["apiKey", "token", "secret", "password", "authorization"];

  for (const [key, value] of Object.entries(params)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      sanitized[key] = value.slice(0, 200);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
