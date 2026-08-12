import { useState, useCallback, useEffect } from "react";
import type { Conversation } from "../types";
import { duskIPC } from "../services/ipc-client";

export function useConversations(workspaceId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setConversations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    duskIPC.conversation
      .list({ workspaceId })
      .then((response: unknown) => {
        const data = (response as { success: boolean; data: Conversation[] }).data;
        setConversations(data || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load conversations");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [workspaceId]);

  const createConversation = useCallback(async (title?: string): Promise<Conversation | undefined> => {
    if (!workspaceId) return undefined;

    setError(null);
    try {
      const response = await duskIPC.conversation.create({ workspaceId, title });
      if ((response as { success: boolean }).success) {
        const newConversation = (response as { success: boolean; data: Conversation }).data;
        setConversations((prev) => [newConversation, ...prev]);
        return newConversation;
      }
      return undefined;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create conversation");
      return undefined;
    }
  }, [workspaceId]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    await duskIPC.conversation.delete({ conversationId });
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
  }, []);

  return {
    conversations,
    isLoading,
    error,
    createConversation,
    deleteConversation,
  };
}
