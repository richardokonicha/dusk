import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { Container } from "../../core/container";
import { IpcChannel } from "../../../../../shared/dist/src/IpcChannel.js";
import { z } from "zod";
import type { AgentConfig, AgentEvent, AgentInput, AgentResult } from "../../../../../shared/dist/src/types/agent.js";
import { validateSender } from "../../security/sender-validator";

const agentListSchema = z.object({});
const agentCreateSchema = z.object({ config: z.custom<AgentConfig>() });
const agentGetSchema = z.object({ id: z.string() });
const agentUpdateSchema = z.object({ id: z.string(), updates: z.record(z.unknown()) });
const agentDeleteSchema = z.object({ id: z.string() });
const agentInvokeSchema = z.object({ input: z.custom<AgentInput>() });
const agentStopSchema = z.object({ id: z.string() });
const agentRunSchema = z.object({ id: z.string(), input: z.custom<AgentInput>() });
const agentSwitchSchema = z.object({ agentId: z.string() });

export function registerAgentHandlers(container: Container): void {
  const orchestrator = container.agentRuntime;

  ipcMain.handle(IpcChannel.Agent_List, async (event) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    return orchestrator.listAgents();
  });

  ipcMain.handle(IpcChannel.Agent_Create, async (event, raw) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    const { config } = agentCreateSchema.parse(raw);
    return orchestrator.createAgent(config);
  });

  ipcMain.handle(IpcChannel.Agent_Get, async (event, raw) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    const { id } = agentGetSchema.parse(raw);
    return orchestrator.getAgentConfig(id);
  });

  ipcMain.handle(IpcChannel.Agent_Update, async (event, raw) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    const { id, updates } = agentUpdateSchema.parse(raw);
    return orchestrator.updateAgent(id, updates);
  });

  ipcMain.handle(IpcChannel.Agent_Delete, async (event, raw) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    const { id } = agentDeleteSchema.parse(raw);
    return orchestrator.deleteAgent(id);
  });

  ipcMain.handle(IpcChannel.Agent_Invoke, async (event, raw) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    const { input } = agentInvokeSchema.parse(raw);
    return orchestrator.invoke(input);
  });

  ipcMain.handle(IpcChannel.Agent_Stop, async (event, raw) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    const { id } = agentStopSchema.parse(raw);
    return orchestrator.stopAgent(id);
  });

  ipcMain.handle(IpcChannel.Agent_Run, async (event: IpcMainInvokeEvent, raw) => {
    if (!validateSender(event)) {
      return { success: false as const, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    const { id, input } = agentRunSchema.parse(raw);
    const agent = orchestrator.getAgent(id) || orchestrator.getAgent('default-workspace');
    if (!agent) {
      return { success: false as const, error: { code: "AGENT_NOT_FOUND", message: `Agent ${id} not found` } };
    }

    try {
      for await (const chunk of agent.invokeStream(input)) {
        event.sender.send(IpcChannel.Agent_StreamChunk, chunk);
      }
      return { success: true as const, data: { streamStarted: true } };
    } catch (error) {
      event.sender.send(IpcChannel.Agent_StreamChunk, {
        type: "error",
        error: error instanceof Error ? error : new Error("Stream error")
      });
      return { success: false as const, error: { code: "STREAM_ERROR", message: (error instanceof Error ? error : new Error("Stream error")).message } };
    }
  });

  ipcMain.handle("agent:switch", async (event, raw) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    const { agentId } = agentSwitchSchema.parse(raw);
    const success = await orchestrator.switchAgent(agentId);
    return { success, activeAgentId: orchestrator.getActiveAgentId() };
  });

  ipcMain.handle("agent:statuses", async (event) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    return orchestrator.getAgentStatuses();
  });

  ipcMain.handle("agent:active", async (event) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    return {
      id: orchestrator.getActiveAgentId(),
      status: orchestrator.getActiveAgent().getState(),
    };
  });
}
