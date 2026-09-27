import { MODALITY } from '@dusk/provider-registry'
import { getDshRuntimeBuiltinTools } from '@shared/ai/dshBuiltinTools'
import type { Model } from '@shared/data/types/model'
import type { Provider } from '@shared/data/types/provider'
import { describe, expect, it } from 'vitest'

import { AGENT_RUNTIME_CAPABILITIES } from '../agentRuntimeCapabilities'

function makeProvider(overrides: Partial<Provider>): Provider {
  return {
    id: 'p',
    name: 'P',
    defaultChatEndpoint: 'anthropic-messages',
    endpointConfigs: { 'anthropic-messages': { adapterFamily: 'anthropic' } },
    ...overrides
  } as Provider
}

function makeModel(overrides: Partial<Model>): Model {
  return {
    id: 'p::m',
    providerId: 'p',
    name: 'M',
    capabilities: [],
    contextWindow: 128_000,
    supportsStreaming: true,
    isEnabled: true,
    isHidden: false,
    ...overrides
  } as Model
}

describe('AGENT_RUNTIME_CAPABILITIES', () => {
  it('projects the stable shell toggle to pwsh only on Windows', () => {
    expect(getDshRuntimeBuiltinTools('darwin').map((tool) => tool.name)).toContain('bash')
    expect(getDshRuntimeBuiltinTools('win32').map((tool) => tool.name)).toContain('pwsh')
    expect(getDshRuntimeBuiltinTools('win32').map((tool) => tool.name)).not.toContain('bash')
  })

  it('keeps permission choices aligned with each runtime approval implementation', () => {
    expect(AGENT_RUNTIME_CAPABILITIES['claude-code'].permissionModes).toContain('plan')
    expect(AGENT_RUNTIME_CAPABILITIES['claude-code'].permissionModes).toContain('auto')
    expect(AGENT_RUNTIME_CAPABILITIES.pi.permissionModes).not.toContain('plan')
    // pi implements `auto` itself in the approval extension, so it offers it.
    expect(AGENT_RUNTIME_CAPABILITIES.pi.permissionModes).toContain('auto')
    // dsh plan mode is enforced by the bridge policy (its own plan mode is guidance-only).
    expect(AGENT_RUNTIME_CAPABILITIES.dsh.permissionModes).toContain('plan')
    expect(AGENT_RUNTIME_CAPABILITIES.dsh.permissionModes).not.toContain('auto')
    expect(AGENT_RUNTIME_CAPABILITIES['claude-code'].createDefaults.permissionMode).toBe('auto')
    expect(AGENT_RUNTIME_CAPABILITIES.pi.createDefaults.permissionMode).toBe('auto')
    expect(AGENT_RUNTIME_CAPABILITIES.dsh.createDefaults.permissionMode).toBe('acceptEdits')
  })

  describe('isModelCompatible — generic models', () => {
    const piIsCompatible = AGENT_RUNTIME_CAPABILITIES.pi.isModelCompatible

    it('pi still accepts a normal pi-compatible model', () => {
      const provider = makeProvider({})
      expect(piIsCompatible(provider, makeModel({}))).toBe(true)
    })
  })

  it('does not grant Cloud compatibility from the display group alone', () => {
    const provider = makeProvider({ id: 'openai', authMethods: ['external-cli'] })
    const model = makeModel({
      providerId: 'openai',
      group: 'OpenAI',
      capabilities: ['embedding']
    })

    expect(AGENT_RUNTIME_CAPABILITIES.pi.isModelCompatible(provider, model)).toBe(false)
    expect(AGENT_RUNTIME_CAPABILITIES.dsh.isModelCompatible(provider, model)).toBe(false)
  })

  describe('dsh model compatibility', () => {
    const isCompatible = AGENT_RUNTIME_CAPABILITIES.dsh.isModelCompatible
    const provider = makeProvider({})

    it('does not filter models by their declared input modalities', () => {
      expect(isCompatible(provider, makeModel({}))).toBe(true)
      expect(isCompatible(provider, makeModel({ inputModalities: [] }))).toBe(true)
      expect(isCompatible(provider, makeModel({ inputModalities: [MODALITY.IMAGE] }))).toBe(true)
      expect(isCompatible(provider, makeModel({ inputModalities: [MODALITY.AUDIO] }))).toBe(true)
      expect(isCompatible(provider, makeModel({ inputModalities: [MODALITY.VIDEO] }))).toBe(true)
    })
  })
})
