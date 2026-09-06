import { agentService } from '@data/services/AgentService'
import { agentSessionService } from '@data/services/AgentSessionService'
import { BUILTIN_AGENT_ROLE, DUSK_SUPPORT_AGENT_ID } from '@shared/ai/builtinAgent'
import type { AgentConfiguration } from '@shared/data/api/schemas/agents'
import { AGENT_WORKSPACE_TYPE } from '@shared/data/api/schemas/agentWorkspaces'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'

import type { DbType, ISeeder } from '../../types'

const DUSK_SUPPORT_SEED = {
  name: {
    default: 'Dusk Support',
    zh: 'Dusk 支持'
  },
  configuration: {
    avatar: '🧰',
    permission_mode: 'acceptEdits',
    bootstrap_completed: true,
    builtin_role: BUILTIN_AGENT_ROLE.SUPPORT,
    env_vars: {}
  } satisfies AgentConfiguration
} as const

export class DuskSupportSeeder implements ISeeder {
  readonly name = 'duskSupport'
  readonly description = 'Insert the builtin Dusk Support agent in every agent library'
  readonly executionPolicy = 'run-on-change' as const
  readonly version = '3'

  run(db: DbType): void {
    db.transaction((tx) => {
      agentService.clearUntrustedBuiltinSupportRolesTx(tx)
      agentService.claimBuiltinSupportIdentityTx(tx)
      const existing = agentService.findBuiltinAgentByRoleTx(tx, BUILTIN_AGENT_ROLE.SUPPORT, {
        includeDeleted: true
      })
      if (existing) {
        if (existing.name === 'Dusk 支持') {
          agentService.updateAgentTx(tx, existing.id, { name: DUSK_SUPPORT_SEED.name.zh })
        }
        return
      }

      const assistant = agentService.findBuiltinAgentByRoleTx(tx, BUILTIN_AGENT_ROLE.ASSISTANT)
      const agentId = DUSK_SUPPORT_AGENT_ID
      const row = agentService.createAgentTx(tx, agentId, {
        id: agentId,
        type: 'claude-code',
        name: this.getNameForPreferredSystemLanguage(),
        description: '',
        instructions: '',
        model: assistant?.model ?? null,
        configuration: { ...DUSK_SUPPORT_SEED.configuration }
      })

      if (!row) {
        throw new Error('insert succeeded but select returned no builtin Dusk Support row')
      }

      agentSessionService.createTx(tx, uuidv4(), {
        agentId,
        name: '',
        workspace: { type: AGENT_WORKSPACE_TYPE.SYSTEM }
      })
    })
  }

  private getNameForPreferredSystemLanguage(): string {
    try {
      const language = app.getPreferredSystemLanguages()[0]
      return language?.toLowerCase().startsWith('zh') ? DUSK_SUPPORT_SEED.name.zh : DUSK_SUPPORT_SEED.name.default
    } catch {
      return DUSK_SUPPORT_SEED.name.default
    }
  }
}
