import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { DatabaseService } from "../../services/db";
import { WorkspaceRepository } from "../../db/repositories/workspace";
import { ConversationRepository } from "../../db/repositories/conversation";
import { MessageRepository } from "../../db/repositories/message";

describe("Integration Smoke Test", () => {
  let dbService: DatabaseService;
  let workspaceRepo: WorkspaceRepository;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let dbPath: string;

  beforeEach(() => {
    dbService = DatabaseService.getInstance();
    (dbService as any).initialized = false;
    (dbService as any).db = undefined;
    (dbService as any).drizzleDb = undefined;

    dbPath = path.join(os.tmpdir(), `smoke-test-${crypto.randomUUID()}.db`);
  });

  afterEach(async () => {
    if (dbService) {
      await dbService.shutdown();
    }
    if (dbPath) {
      try {
        fs.unlinkSync(dbPath);
      } catch {}
      try {
        fs.unlinkSync(`${dbPath}-wal`);
      } catch {}
      try {
        fs.unlinkSync(`${dbPath}-shm`);
      } catch {}
    }
  });

  it("exercises full workspace -> conversation -> message flow", async () => {
    await dbService.initialize(dbPath);

    workspaceRepo = dbService.workspace;
    conversationRepo = dbService.conversation;
    messageRepo = dbService.message;

    const workspace = await workspaceRepo.create({
      id: crypto.randomUUID(),
      name: "Test Workspace",
      path: "/tmp/test-workspace",
      description: "A test workspace",
    });
    expect(workspace.id).toBeDefined();
    expect(workspace.name).toBe("Test Workspace");

    const retrievedWorkspace = await workspaceRepo.findById(workspace.id);
    expect(retrievedWorkspace).toBeDefined();
    expect(retrievedWorkspace!.name).toBe("Test Workspace");

    const allWorkspaces = await workspaceRepo.findAll();
    expect(allWorkspaces).toHaveLength(1);
    expect(allWorkspaces[0].id).toBe(workspace.id);

    const conversation = await conversationRepo.create({
      id: crypto.randomUUID(),
      workspaceId: workspace.id,
      title: "Test Conversation",
    });
    expect(conversation.id).toBeDefined();
    expect(conversation.workspaceId).toBe(workspace.id);

    const retrievedConversation = await conversationRepo.findById(conversation.id);
    expect(retrievedConversation).toBeDefined();
    expect(retrievedConversation!.title).toBe("Test Conversation");

    const message = await messageRepo.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      role: "user",
      content: "Hello, world!",
    });
    expect(message.id).toBeDefined();
    expect(message.content).toBe("Hello, world!");

    const messageHistory = await messageRepo.findAll(conversation.id);
    expect(messageHistory).toHaveLength(1);
    expect(messageHistory[0].content).toBe("Hello, world!");

    const updatedWorkspace = await workspaceRepo.update(workspace.id, {
      name: "Updated Workspace",
    });
    expect(updatedWorkspace).toBeDefined();
    expect(updatedWorkspace!.name).toBe("Updated Workspace");

    await messageRepo.delete(message.id);
    const messagesAfterDelete = await messageRepo.findAll(conversation.id);
    expect(messagesAfterDelete).toHaveLength(0);

    await conversationRepo.delete(conversation.id);
    const conversationsAfterDelete = await conversationRepo.findById(conversation.id);
    expect(conversationsAfterDelete).toBeUndefined();

    await workspaceRepo.delete(workspace.id);
    const workspacesAfterDelete = await workspaceRepo.findById(workspace.id);
    expect(workspacesAfterDelete).toBeUndefined();

    const finalWorkspaces = await workspaceRepo.findAll();
    expect(finalWorkspaces).toHaveLength(0);
  });
});
