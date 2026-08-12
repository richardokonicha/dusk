import { ipcMain } from "electron";
import { z } from "zod";
import { Container } from "../../core/container";
import { validateSender } from "../../security/sender-validator";
import { DatabaseService } from "../../services/db";
import { WorkspaceRepository } from "../../db/repositories/workspace";
import { ConversationRepository } from "../../db/repositories/conversation";
import { MessageRepository } from "../../db/repositories/message";
import {
  workspaceListSchema,
  workspaceCreateSchema,
  workspaceGetSchema,
  workspaceUpdateSchema,
  workspaceDeleteSchema,
  conversationListSchema,
  conversationCreateSchema,
  conversationGetSchema,
  conversationDeleteSchema,
  messageSendSchema,
  messageHistorySchema,
  messageStreamSchema,
  systemInfoSchema,
  systemOpenPathSchema,
} from "../validator";
import { channels } from "../channels";

const workspaceRepo = new WorkspaceRepository(DatabaseService.getInstance().drizzle);
const conversationRepo = new ConversationRepository(DatabaseService.getInstance().drizzle);
const messageRepo = new MessageRepository(DatabaseService.getInstance().drizzle);

export function registerCoreHandlers(container: Container): void {
  ipcMain.handle(channels.workspace.list, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { workspaceId } = workspaceListSchema.parse(args);
      const workspaces = workspaceId
        ? (await workspaceRepo.findById(workspaceId))
          ? [await workspaceRepo.findById(workspaceId)].filter(Boolean)
          : []
        : await workspaceRepo.findAll();
      return { success: true, data: workspaces };
    } catch (error) {
      return { success: false, error: { code: "WORKSPACE_LIST_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.workspace.create, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { name, path: workspacePath } = workspaceCreateSchema.parse(args);
      const workspace = await workspaceRepo.create({ id: crypto.randomUUID(), name, path: workspacePath });
      return { success: true, data: workspace };
    } catch (error) {
      return { success: false, error: { code: "WORKSPACE_CREATE_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.workspace.get, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { workspaceId } = workspaceGetSchema.parse(args);
      const workspace = await workspaceRepo.findById(workspaceId);
      if (!workspace) {
        return { success: false, error: { code: "WORKSPACE_NOT_FOUND", message: "Workspace not found" } };
      }
      return { success: true, data: workspace };
    } catch (error) {
      return { success: false, error: { code: "WORKSPACE_GET_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.workspace.update, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { workspaceId, name, path: workspacePath } = workspaceUpdateSchema.parse(args);
      const workspace = await workspaceRepo.update(workspaceId, { name, path: workspacePath });
      return { success: true, data: workspace };
    } catch (error) {
      return { success: false, error: { code: "WORKSPACE_UPDATE_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.workspace.delete, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { workspaceId } = workspaceDeleteSchema.parse(args);
      await workspaceRepo.delete(workspaceId);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: "WORKSPACE_DELETE_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.conversation.list, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { workspaceId } = conversationListSchema.parse(args);
      const conversations = await conversationRepo.findByWorkspace(workspaceId);
      return { success: true, data: conversations };
    } catch (error) {
      return { success: false, error: { code: "CONVERSATION_LIST_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.conversation.create, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { workspaceId, title } = conversationCreateSchema.parse(args);
      const conversation = await conversationRepo.create({ id: crypto.randomUUID(), workspaceId, title });
      return { success: true, data: conversation };
    } catch (error) {
      return { success: false, error: { code: "CONVERSATION_CREATE_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.conversation.get, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { conversationId } = conversationGetSchema.parse(args);
      const conversation = await conversationRepo.findById(conversationId);
      if (!conversation) {
        return { success: false, error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" } };
      }
      return { success: true, data: conversation };
    } catch (error) {
      return { success: false, error: { code: "CONVERSATION_GET_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.conversation.delete, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { conversationId } = conversationDeleteSchema.parse(args);
      await conversationRepo.delete(conversationId);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: "CONVERSATION_DELETE_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.message.send, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { conversationId, content, role } = messageSendSchema.parse(args);
      const message = await messageRepo.create({ id: crypto.randomUUID(), conversationId, content, role: role || "user" });
      return { success: true, data: message };
    } catch (error) {
      return { success: false, error: { code: "MESSAGE_SEND_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.message.history, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { conversationId, limit, offset } = messageHistorySchema.parse(args);
      const messages = await messageRepo.findAll(conversationId);
      return { success: true, data: messages };
    } catch (error) {
      return { success: false, error: { code: "MESSAGE_HISTORY_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.message.stream, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { conversationId, content, role } = messageStreamSchema.parse(args);
      const message = await messageRepo.create({ id: crypto.randomUUID(), conversationId, content, role: role || "user" });
      return { success: true, data: message };
    } catch (error) {
      return { success: false, error: { code: "MESSAGE_STREAM_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.system.info, async (event) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const info = {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        electronVersion: process.versions.electron || "unknown",
        nodeVersion: process.versions.node || "unknown",
        chromeVersion: process.versions.chrome || "unknown",
      };
      return { success: true, data: info };
    } catch (error) {
      return { success: false, error: { code: "SYSTEM_INFO_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.system.openPath, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { path: filePath } = systemOpenPathSchema.parse(args);
      const { shell } = await import("electron");
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: "SYSTEM_OPEN_PATH_ERROR", message: (error as Error).message } };
    }
  });
}
