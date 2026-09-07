import { describe, expect, it } from 'vitest'

import { parseAgentRouteSearch } from '../routeSearch'

describe('parseAgentRouteSearch', () => {
  it('accepts the feedback intent alongside existing search fields', () => {
    expect(parseAgentRouteSearch({ intent: 'feedback', sessionId: 'session-1', view: 'message' })).toEqual({
      agentId: undefined,
      intent: 'feedback',
      sessionId: 'session-1',
      view: 'message',
      workspaceId: undefined
    })
  })

  it('parses the sidebar agentId for pinned entity entries', () => {
    expect(parseAgentRouteSearch({ agentId: 'agent-1' })).toEqual({
      agentId: 'agent-1',
      intent: undefined,
      sessionId: undefined,
      view: undefined,
      workspaceId: undefined
    })
  })

  it('keeps agentId alongside an explicit session', () => {
    expect(parseAgentRouteSearch({ agentId: 'agent-1', sessionId: 'session-1' })).toEqual({
      agentId: 'agent-1',
      intent: undefined,
      sessionId: 'session-1',
      view: undefined,
      workspaceId: undefined
    })
  })

  it('drops non-string agentId values', () => {
    expect(parseAgentRouteSearch({ agentId: 7 })).toEqual({
      agentId: undefined,
      intent: undefined,
      sessionId: undefined,
      view: undefined,
      workspaceId: undefined
    })
  })

  it('parses workspaceId for workspace-bound session entry', () => {
    expect(parseAgentRouteSearch({ workspaceId: 'ws-1' })).toEqual({
      agentId: undefined,
      intent: undefined,
      sessionId: undefined,
      view: undefined,
      workspaceId: 'ws-1'
    })
  })

  it('drops non-string workspaceId values', () => {
    expect(parseAgentRouteSearch({ workspaceId: 42 })).toEqual({
      agentId: undefined,
      intent: undefined,
      sessionId: undefined,
      view: undefined,
      workspaceId: undefined
    })
  })

  it('drops unknown intents', () => {
    expect(parseAgentRouteSearch({ intent: 'other' })).toEqual({
      agentId: undefined,
      intent: undefined,
      sessionId: undefined,
      view: undefined,
      workspaceId: undefined
    })
  })
})
