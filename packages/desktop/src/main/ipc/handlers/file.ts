import { ipcMain } from "electron";
import { Container } from "../../core/container";
import { FileService } from "../../services/file-service";
import { ArtifactService } from "../../services/artifact-service";
import {
  fileListSchema,
  fileReadSchema,
  fileWriteSchema,
  fileDeleteSchema,
  fileCreateDirSchema,
  fileWatchSchema,
  artifactListSchema,
  artifactSaveSchema,
  artifactGetSchema,
  artifactDeleteSchema,
  artifactLinkSchema,
  workspaceExportSchema,
  workspaceImportSchema,
} from "../validator";
import { validateSender } from "../../security/sender-validator";
import { channels } from "../channels";

export function registerFileHandlers(container: Container): void {
  const fileService = new FileService(container.workspaceOrganizer);
  const artifactService = new ArtifactService(container.workspaceOrganizer);

  ipcMain.handle(channels.file.list, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = fileListSchema.parse(args);
      const files = await fileService.list(input);
      return { success: true, data: files };
    } catch (error) {
      return { success: false, error: { code: "FILE_LIST_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.file.read, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = fileReadSchema.parse(args);
      const content = await fileService.read(input);
      return { success: true, data: { content } };
    } catch (error) {
      return { success: false, error: { code: "FILE_READ_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.file.write, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = fileWriteSchema.parse(args);
      await fileService.write(input);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: "FILE_WRITE_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.file.delete, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = fileDeleteSchema.parse(args);
      await fileService.delete(input);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: "FILE_DELETE_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.file.createDir, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = fileCreateDirSchema.parse(args);
      await fileService.createDir(input);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: "FILE_CREATE_DIR_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.file.watch, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = fileWatchSchema.parse(args);

      const cleanup = await fileService.watch(event, input);

      return { success: true };
    } catch (error) {
      return { success: false, error: { code: "FILE_WATCH_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.artifact.list, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = artifactListSchema.parse(args);
      const artifacts = await artifactService.list(input);
      return { success: true, data: artifacts };
    } catch (error) {
      return { success: false, error: { code: "ARTIFACT_LIST_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.artifact.get, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = artifactGetSchema.parse(args);
      const artifact = await artifactService.get(input);
      if (!artifact) {
        return { success: false, error: { code: "ARTIFACT_NOT_FOUND", message: "Artifact not found" } };
      }
      return { success: true, data: artifact };
    } catch (error) {
      return { success: false, error: { code: "ARTIFACT_GET_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.artifact.save, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = artifactSaveSchema.parse(args);
      const metadata = await artifactService.save(input);
      return { success: true, data: metadata };
    } catch (error) {
      return { success: false, error: { code: "ARTIFACT_SAVE_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.artifact.delete, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = artifactDeleteSchema.parse(args);
      await artifactService.delete(input);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: "ARTIFACT_DELETE_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.artifact.link, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = artifactLinkSchema.parse(args);
      await artifactService.link(input);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: "ARTIFACT_LINK_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.workspace.export, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = workspaceExportSchema.parse(args);
      const zipBuffer = await fileService.exportWorkspace(input);
      return { success: true, data: zipBuffer };
    } catch (error) {
      return { success: false, error: { code: "WORKSPACE_EXPORT_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(channels.workspace.import, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const input = workspaceImportSchema.parse(args);
      const buffer = Buffer.from(input.data.buffer || input.data);
      const workspaceId = crypto.randomUUID();
      const result = await fileService.importWorkspace({ workspaceId, data: input.data });
      return { success: true, data: { ...result, workspaceId } };
    } catch (error) {
      return { success: false, error: { code: "WORKSPACE_IMPORT_ERROR", message: (error as Error).message } };
    }
  });
}
