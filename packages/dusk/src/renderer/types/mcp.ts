import { McpConfigSampleSchema } from '@shared/data/types/mcpServer'
import { isBuiltinMcpServerName } from '@shared/utils/mcp'
import * as z from 'zod'

/**
 * Define MCP server communication types.
 * stdio: Communicate with subprocess via stdin/stdout (most common).
 * sse:  Communicate via HTTP Server-Sent Events.
 *
 * Allow inMemory as a valid field, requires additional validation that name is builtin
 */
export const McpServerTypeSchema = z
  .string()
  .default('stdio')
  .transform((type) => {
    if (type.includes('http')) {
      return 'streamableHttp'
    } else {
      return type
    }
  })
  .pipe(z.union([z.literal('stdio'), z.literal('sse'), z.literal('streamableHttp'), z.literal('inMemory')])) // Most cases default to stdio

export const McpServerInstallSourceSchema = z.enum(['builtin', 'manual', 'protocol', 'unknown']).default('unknown')
export type McpServerInstallSource = z.infer<typeof McpServerInstallSourceSchema>

/**
 * Define a single MCP server configuration.
 * FIXME: For compatibility, temporarily allow users to edit arbitrary fields, which may cause issues.
 * Other than type matching, the only explicitly prohibited behavior is setting type to inMemory
 */
export const McpServerConfigSchema = z
  .object({
    /**
     * Server internal ID
     * Optional. Used to uniquely identify the server internally.
     */
    id: z.string().optional().describe('Server internal id.'),
    /**
     * Server name
     * Optional. Used to identify and display the server.
     */
    name: z.string().optional().describe('Server name for identification and display'),
    /**
     * Server communication type.
     * Optional. Defaults to "stdio" if not specified.
     */
    type: McpServerTypeSchema.optional(),
    /**
     * Server description
     * Optional. Describes the server's functionality and purpose.
     */
    description: z.string().optional().describe('Server description'),
    /**
     * Server URL address
     * Optional. Specifies the server's access address.
     */
    url: z.string().optional().describe('Server URL address'),
    /**
     * Internal alias for url, baseUrl field takes priority.
     * Optional. Specifies the server's access address.
     */
    baseUrl: z.string().optional().describe('Server URL address'),
    /**
     * Command to start the server (e.g., "uvx", "npx").
     * Optional.
     */
    command: z.string().optional().describe("The command to execute (e.g., 'uvx', 'npx')"),
    /**
     * Registry URL
     * Optional. Specifies the server's registry address.
     */
    registryUrl: z.string().optional().describe('Registry URL for the server'),
    /**
     * Array of arguments passed to the command.
     * Usually the first argument is the script path or package name.
     * Optional.
     */
    args: z.array(z.string()).optional().describe('The arguments to pass to the command'),
    /**
     * Environment variables object injected at startup.
     * Keys are variable names, values are strings.
     * Optional.
     */
    env: z.record(z.string(), z.string()).optional().describe('Environment variables for the server process'),
    /**
     * Request header configuration
     * Optional. Used to set custom headers for requests.
     */
    headers: z.record(z.string(), z.string()).optional().describe('Custom headers configuration'),
    /**
     * Provider name
     * Optional. Specifies the server's provider.
     */
    provider: z.string().optional().describe('Provider name for the server'),
    /**
     * Provider URL
     * Optional. Specifies the provider's website or documentation address.
     */
    providerUrl: z.string().optional().describe('URL of the provider website or documentation'),
    /**
     * Logo URL
     * Optional. Specifies the server's logo image address.
     */
    logoUrl: z.string().optional().describe('URL of the server logo'),
    /**
     * Server tags
     * Optional. Used to categorize and label servers.
     */
    tags: z.array(z.string()).optional().describe('Server tags for categorization'),
    /**
     * Whether the server is long-running
     * Optional. Identifies whether the server needs to run continuously.
     */
    longRunning: z.boolean().optional().describe('Whether the server is long running'),
    /**
     * Request timeout
     * Optional. In seconds, defaults to 60 seconds.
     */
    timeout: z
      .preprocess((val) => {
        if (typeof val === 'string' && val.trim() !== '') {
          const parsed = Number(val)
          return isNaN(parsed) ? val : parsed
        }
        return val
      }, z.number().optional())
      .describe('Timeout in seconds for requests to this server'),
    /**
     * DXT package version
     * Optional. Identifies the DXT package version.
     */
    dxtVersion: z.string().optional().describe('Version of the DXT package'),
    /**
     * DXT package extraction path
     * Optional. Specifies where the DXT package was extracted.
     */
    dxtPath: z.string().optional().describe('Path where the DXT package was extracted'),
    /**
     * Reference link
     * Optional. Documentation or homepage link for the server.
     */
    reference: z.string().optional().describe('Reference link for the server'),
    /**
     * Search keywords
     * Optional. Keywords for server search.
     */
    searchKey: z.string().optional().describe('Search key for the server'),
    /**
     * Configuration sample
     * Optional. Example configuration for the server.
     */
    configSample: McpConfigSampleSchema.optional().describe('Configuration sample for the server'),
    /**
     * List of disabled tools
     * Optional. Specifies tools disabled on this server.
     */
    disabledTools: z.array(z.string()).optional().describe('List of disabled tools for this server'),
    /**
     * List of tools disabled for auto-approval
     * Optional. Specifies tools disabled for auto-approval on this server.
     */
    disabledAutoApproveTools: z
      .array(z.string())
      .optional()
      .describe('List of tools that are disabled for auto-approval on this server'),
    /**
     * Whether configuration is required
     * Optional. Identifies whether the server needs configuration.
     */
    shouldConfig: z.boolean().optional().describe('Whether the server should be configured'),
    /**
     * Whether the server is active
     * Optional. Identifies whether the server is in active state.
     */
    isActive: z.boolean().optional().describe('Whether the server is active'),
    installSource: McpServerInstallSourceSchema.optional().describe('Where the MCP server was installed from'),
    isTrusted: z.boolean().optional().describe('Whether the MCP server has been trusted by user'),
    trustedAt: z.number().optional().describe('Timestamp when the server was trusted'),
    installedAt: z.number().optional().describe('Timestamp when the server was installed')
  })
  .strict()
  // Additional validation logic defined here
  .refine(
    (schema) => {
      if (schema.type === 'inMemory' && schema.name && !isBuiltinMcpServerName(schema.name)) {
        return false
      }
      return true
    },
    {
      message: 'Server type is inMemory but this is not a builtin MCP server, which is not allowed'
    }
  )
  .transform((schema) => {
    // Explicitly provided type overrides url-inferred logic
    if (!schema.type) {
      const url = schema.baseUrl ?? schema.url ?? null
      // NOTE: url implies server type is streamableHttp or sse, may extend other types in future
      if (url !== null) {
        const type = getMcpServerType(url)
        return {
          ...schema,
          type
        } as const
      }
    }
    return schema
  })
/**
 * Map server aliases (string IDs) to their configurations.
 * Example: { "my-tools": { command: "...", args: [...] }, "github": { ... } }
 */
export const McpServersMapSchema = z.record(z.string(), McpServerConfigSchema)
/**
 * Top-level configuration object schema.
 * Represents the structure of the entire MCP configuration file.
 */
export const McpConfigSchema = z.object({
  /**
   * Map containing one or more MCP server definitions.
   * Names (keys) are user-defined aliases.
   * This field is required.
   */
  // Don't refine server count here because type definition files can't use i18n for error messages
  mcpServers: McpServersMapSchema.describe('Mapping of server aliases to their configurations')
})
// Data validation types, McpServerType reused for McpServer

export type McpServerType = z.infer<typeof McpServerTypeSchema>
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>
export type McpServersMap = z.infer<typeof McpServersMapSchema>
export type McpConfig = z.infer<typeof McpConfigSchema>
/**
 * Validate whether an unknown object is a valid MCP configuration.
 * @param config - Configuration object to validate
 * @returns Parsed `McpConfig` object if valid, otherwise throws ZodError.
 */

export function validateMcpConfig(config: unknown): McpConfig {
  return McpConfigSchema.parse(config)
}
/**
 * Safely validate an unknown object, returning result and possible error.
 * @param config - Configuration object to validate
 * @returns `SafeParseResult` containing success/failure status and data.
 */

export function safeValidateMcpConfig(config: unknown) {
  return McpConfigSchema.safeParse(config)
}

/**
 * Safely validate whether an unknown object is a valid MCP server configuration.
 * @param config - Configuration object to validate
 * @returns `SafeParseResult` containing success/failure status and data.
 */
export function safeValidateMcpServerConfig(config: unknown) {
  return McpServerConfigSchema.safeParse(config)
}

/**
 * Determine MCP server type from given URL.
 * If URL ends with "/mcp", type is "streamableHttp", otherwise "sse".
 *
 * @param url - Server URL address
 * @returns MCP server type ('streamableHttp' or 'sse')
 */
export function getMcpServerType(url: string): McpServerType {
  return url.endsWith('/mcp') ? 'streamableHttp' : 'sse'
}
