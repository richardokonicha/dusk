/**
 * Runtime-neutral approval policy for Dusk-owned MCP tools.
 *
 * This is a registry of tool entries, not parallel allow/approval name lists. Each tool declares
 * its canonical MCP identity and approval behavior once; Claude, Pi, and DSH only translate that
 * identity into their runtime-specific wire names. Arrays or sets produced by consumers are
 * derived boundary formats for the SDK/bridge and are never policy sources.
 *
 * This deliberately does not extend the AI-SDK `ToolEntry`: that adapter does not own or even see
 * every Dusk-owned tool (Assistant MCP and the other agent runtimes bypass it). Cross-runtime
 * approval is a security policy and belongs in the runtime-neutral approval layer.
 */

import { CLI_INSTALL_TOOL_NAME, CLI_LIST_TOOL_NAME, CLI_SEARCH_TOOL_NAME } from '@main/ai/mcp/servers/duskCliTools'
import { MOVE_TO_TRASH_TOOL_NAME } from '@main/ai/tools/moveToTrash'
import { SAVE_ATTACHMENT_TOOL_NAME } from '@main/ai/tools/saveAttachment'
import {
  SESSION_CREATE_TOOL_NAME,
  SESSION_DELIVERIES_TOOL_NAME,
  SESSION_LIST_TOOL_NAME,
  SESSION_SEARCH_TOOL_NAME,
  SESSION_SEND_TOOL_NAME
} from '@shared/ai/agentSessionDelivery'
import {
  CONFIG_TOOL_NAME,
  CRON_TOOL_NAME,
  GENERATE_IMAGE_TOOL_NAME,
  KB_LIST_TOOL_NAME,
  KB_MANAGE_TOOL_NAME,
  KB_READ_TOOL_NAME,
  KB_SEARCH_TOOL_NAME,
  NOTIFY_TOOL_NAME,
  READ_FILE_TOOL_NAME,
  REPORT_ARTIFACTS_TOOL_NAME,
  TO_MARKDOWN_TOOL_NAME,
  WEB_FETCH_TOOL_NAME,
  WEB_SEARCH_TOOL_NAME
} from '@shared/ai/builtinTools'

export type BuiltinToolApproval = 'auto' | 'required' | 'runtime'
export type BuiltinToolBypassApproval = 'lift' | 'enforce'

/** The Dusk-owned MCP servers. Which of them a session mounts is the runtime's call. */
export const DUSK_MCP_SERVER = {
  DUSK_TOOLS: 'dusk-tools',
  AGENT_MEMORY: 'agent-memory',
  SKILLS: 'skills',
  MCP_MANAGER: 'mcp-manager',
  ASSISTANT: 'assistant',
  ASSISTANT_FILES: 'assistant-files'
} as const

export interface BuiltinToolPolicyEntry {
  readonly serverName: string
  readonly toolName: string
  /**
   * `auto`: Dusk pre-approves the tool; `required`: every interactive call asks unless bypassed;
   * `runtime`: the runtime's ordinary permission-mode semantics decide.
   */
  readonly approval: BuiltinToolApproval
  /** Whether Full Access lifts a `required` approval. */
  readonly bypassApproval: BuiltinToolBypassApproval
}

function tool(
  serverName: string,
  toolName: string,
  approval: BuiltinToolApproval,
  bypassApproval: BuiltinToolBypassApproval = 'lift'
): BuiltinToolPolicyEntry {
  return { serverName, toolName, approval, bypassApproval }
}

/**
 * Every Dusk-owned MCP tool with host approval semantics. A future tool must declare one entry;
 * omitting it is fail-closed for auto-approval because every consumer selects explicit entries.
 */
const BUILTIN_TOOL_POLICIES = {
  duskWebSearch: tool(DUSK_MCP_SERVER.DUSK_TOOLS, WEB_SEARCH_TOOL_NAME, 'auto'),
  duskWebFetch: tool(DUSK_MCP_SERVER.DUSK_TOOLS, WEB_FETCH_TOOL_NAME, 'auto'),
  duskKnowledgeSearch: tool(DUSK_MCP_SERVER.DUSK_TOOLS, KB_SEARCH_TOOL_NAME, 'auto'),
  duskKnowledgeRead: tool(DUSK_MCP_SERVER.DUSK_TOOLS, KB_READ_TOOL_NAME, 'auto'),
  duskKnowledgeList: tool(DUSK_MCP_SERVER.DUSK_TOOLS, KB_LIST_TOOL_NAME, 'auto'),
  duskKnowledgeManage: tool(DUSK_MCP_SERVER.DUSK_TOOLS, KB_MANAGE_TOOL_NAME, 'required'),
  duskReportArtifacts: tool(DUSK_MCP_SERVER.DUSK_TOOLS, REPORT_ARTIFACTS_TOOL_NAME, 'auto'),
  duskCron: tool(DUSK_MCP_SERVER.DUSK_TOOLS, CRON_TOOL_NAME, 'auto'),
  duskNotify: tool(DUSK_MCP_SERVER.DUSK_TOOLS, NOTIFY_TOOL_NAME, 'auto'),
  duskConfig: tool(DUSK_MCP_SERVER.DUSK_TOOLS, CONFIG_TOOL_NAME, 'auto'),
  duskSessionList: tool(DUSK_MCP_SERVER.DUSK_TOOLS, SESSION_LIST_TOOL_NAME, 'auto'),
  duskSessionSearch: tool(DUSK_MCP_SERVER.DUSK_TOOLS, SESSION_SEARCH_TOOL_NAME, 'auto'),
  duskSessionDeliveries: tool(DUSK_MCP_SERVER.DUSK_TOOLS, SESSION_DELIVERIES_TOOL_NAME, 'auto'),
  duskSessionCreate: tool(DUSK_MCP_SERVER.DUSK_TOOLS, SESSION_CREATE_TOOL_NAME, 'required', 'enforce'),
  duskSessionSend: tool(DUSK_MCP_SERVER.DUSK_TOOLS, SESSION_SEND_TOOL_NAME, 'required', 'enforce'),
  duskCliList: tool(DUSK_MCP_SERVER.DUSK_TOOLS, CLI_LIST_TOOL_NAME, 'auto'),
  duskCliSearch: tool(DUSK_MCP_SERVER.DUSK_TOOLS, CLI_SEARCH_TOOL_NAME, 'auto'),
  duskCliInstall: tool(DUSK_MCP_SERVER.DUSK_TOOLS, CLI_INSTALL_TOOL_NAME, 'required'),
  duskToMarkdown: tool(DUSK_MCP_SERVER.DUSK_TOOLS, TO_MARKDOWN_TOOL_NAME, 'auto'),
  duskGenerateImage: tool(DUSK_MCP_SERVER.DUSK_TOOLS, GENERATE_IMAGE_TOOL_NAME, 'required'),

  agentMemory: tool(DUSK_MCP_SERVER.AGENT_MEMORY, 'memory', 'auto'),
  searchSkills: tool(DUSK_MCP_SERVER.SKILLS, 'search_skills', 'auto'),
  installSkill: tool(DUSK_MCP_SERVER.SKILLS, 'install_skill', 'runtime'),
  // A stdio install launches an arbitrary local command with the caller's env, so this asks per call
  // like cli_install rather than deferring to the runtime's permission mode.
  installMcpServer: tool(DUSK_MCP_SERVER.MCP_MANAGER, 'install_mcp_server', 'required'),

  assistantNavigate: tool(DUSK_MCP_SERVER.ASSISTANT, 'navigate', 'auto'),
  assistantProductInfo: tool(DUSK_MCP_SERVER.ASSISTANT, 'product_info', 'auto'),
  assistantDiagnose: tool(DUSK_MCP_SERVER.ASSISTANT, 'diagnose', 'required'),
  assistantApplySetting: tool(DUSK_MCP_SERVER.ASSISTANT, 'apply_setting', 'required'),
  assistantCreateAgent: tool(DUSK_MCP_SERVER.ASSISTANT, 'create_agent', 'required'),
  assistantPrepareDiagnosticReport: tool(DUSK_MCP_SERVER.ASSISTANT, 'prepare_diagnostic_report', 'auto'),
  assistantReadFile: tool(DUSK_MCP_SERVER.ASSISTANT_FILES, READ_FILE_TOOL_NAME, 'auto'),
  assistantMoveToTrash: tool(DUSK_MCP_SERVER.ASSISTANT_FILES, MOVE_TO_TRASH_TOOL_NAME, 'required'),
  assistantSaveAttachment: tool(DUSK_MCP_SERVER.ASSISTANT_FILES, SAVE_ATTACHMENT_TOOL_NAME, 'required')
} as const satisfies Record<string, BuiltinToolPolicyEntry>

const BUILTIN_TOOL_POLICY_ENTRIES: readonly BuiltinToolPolicyEntry[] = Object.values(BUILTIN_TOOL_POLICIES)
const BUILTIN_TOOL_POLICY_BY_RUNTIME_NAME = new Map(
  BUILTIN_TOOL_POLICY_ENTRIES.map((entry) => [toMcpRuntimeName(entry), entry])
)

export interface BuiltinToolPolicyQuery {
  readonly approval?: BuiltinToolApproval
  readonly bypassApproval?: BuiltinToolBypassApproval
  /** Omit to inspect the complete registry; otherwise keep only entries whose server is mounted. */
  readonly mountedServers?: ReadonlySet<string>
}

/** Query entries without exposing a mutable registry or a maintained name list. */
export function listBuiltinToolPolicies(query: BuiltinToolPolicyQuery = {}): BuiltinToolPolicyEntry[] {
  return BUILTIN_TOOL_POLICY_ENTRIES.filter(
    (entry) =>
      (query.approval === undefined || entry.approval === query.approval) &&
      (query.bypassApproval === undefined || entry.bypassApproval === query.bypassApproval) &&
      (query.mountedServers === undefined || query.mountedServers.has(entry.serverName))
  )
}

/** Resolve a Claude-style MCP runtime name against the servers this session actually mounted. */
export function findBuiltinToolPolicy(
  runtimeName: string,
  mountedServers: ReadonlySet<string>
): BuiltinToolPolicyEntry | undefined {
  const entry = BUILTIN_TOOL_POLICY_BY_RUNTIME_NAME.get(runtimeName)
  return entry && mountedServers.has(entry.serverName) ? entry : undefined
}

/** Standard MCP runtime name used by Claude Code and by safe DSH bridged identities. */
export function toMcpRuntimeName(ref: Pick<BuiltinToolPolicyEntry, 'serverName' | 'toolName'>): string {
  return `mcp__${ref.serverName}__${ref.toolName}`
}

/** Convenience for the non-policy citation call site. */
export function toDuskBuiltinRuntimeName(toolName: string): string {
  return toMcpRuntimeName({ serverName: 'dusk-tools', toolName })
}
