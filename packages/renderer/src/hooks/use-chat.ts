import { useState, useCallback, useRef, useEffect } from "react";
import type { Message, ChatState, MessageBlock, MessageRole } from "@/types";
import { ipcClient } from "@shared/ipc";
import { IpcChannel } from "@shared/IpcChannel";
import type { AgentEvent, AgentInput } from "@shared/types/agent";

const generateId = () => Math.random().toString(36).slice(2, 11);

interface StreamChunkData {
  conversationId: string;
  chunk: string;
  blockType?: string;
  isFinal?: boolean;
  blockId?: string;
}

export function useChat(conversationId: string | null, agentId: string = "default-workspace") {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isStreaming: false,
    streamingText: "",
    error: null,
    isLoading: false,
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamCompletedRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);
  const activeStreamIdRef = useRef<string | null>(null);
  const MAX_RETRIES = 3;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const isNearBottom = useCallback(() => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return true;
    const threshold = 150;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  useEffect(() => {
    if (state.isStreaming && isNearBottom()) {
      scrollToBottom();
    }
  }, [state.streamingText, state.messages, state.isStreaming, scrollToBottom, isNearBottom]);

  const loadConversation = useCallback(
    async (id: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const history = await ipcClient.message.history({ conversationId: id });
        setState((prev) => ({
          ...prev,
          messages: Array.isArray(history) ? history : [],
          isLoading: false,
          error: null,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to load conversation",
          isLoading: false,
        }));
      }
    },
    []
  );

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [conversationId, loadConversation]);

  const handleStreamChunk = useCallback((data: unknown) => {
    const event = data as AgentEvent;

    setState((prev) => {
      if (!prev.isStreaming) return prev;

      const updated = [...prev.messages];
      let assistantIndex = -1;
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === "assistant") {
          assistantIndex = i;
          break;
        }
      }

      if (assistantIndex < 0) return prev;

      const message = { ...updated[assistantIndex] };
      let blocks = [...message.blocks];
      let newStreamingText = prev.streamingText;

      switch (event.type) {
        case "text": {
          const textContent = event.content || "";
          if (blocks.length > 0 && blocks[blocks.length - 1].type === "text") {
            const lastBlock = blocks[blocks.length - 1];
            blocks[blocks.length - 1] = {
              ...lastBlock,
              content: lastBlock.content + textContent,
            };
          } else {
            blocks.push({
              id: generateId(),
              messageId: message.id,
              type: "text",
              content: textContent,
            });
          }
          newStreamingText = blocks[blocks.length - 1].content;
          break;
        }
        case "tool_call": {
          blocks.push({
            id: generateId(),
            messageId: message.id,
            type: "tool",
            content: JSON.stringify({
              name: event.toolCall.name,
              status: "pending",
              input: event.toolCall.arguments,
            }),
            metadata: { toolCallId: event.toolCall.id },
          });
          break;
        }
        case "tool_result": {
          const toolResult = event.toolResult;
          const existingIndex = blocks.findIndex(
            (b) => b.type === "tool" && (b.metadata as any)?.toolCallId === toolResult.toolCallId
          );
          if (existingIndex >= 0) {
            const existing = blocks[existingIndex];
            let existingData: Record<string, unknown> = {};
            try {
              existingData = JSON.parse(existing.content) as Record<string, unknown>;
            } catch {
              // ignore parse error
            }
            blocks[existingIndex] = {
              ...existing,
              content: JSON.stringify({
                ...existingData,
                status: toolResult.error ? "error" : "success",
                output: toolResult.result,
                error: toolResult.error,
                durationMs: toolResult.durationMs,
              }),
            };
          } else {
            blocks.push({
              id: generateId(),
              messageId: message.id,
              type: "tool",
              content: JSON.stringify({
                name: toolResult.name,
                status: toolResult.error ? "error" : "success",
                output: toolResult.result,
                error: toolResult.error,
                durationMs: toolResult.durationMs,
              }),
              metadata: { toolCallId: toolResult.toolCallId },
            });
          }
          break;
        }
        case "error": {
          const errorMessage =
            event.error instanceof Error ? event.error.message : String(event.error);
          blocks.push({
            id: generateId(),
            messageId: message.id,
            type: "error",
            content: errorMessage,
          });
          return {
            ...prev,
            messages: updated,
            isStreaming: false,
            streamingText: "",
            error: errorMessage,
          };
        }
        case "artifact": {
          blocks.push({
            id: generateId(),
            messageId: message.id,
            type: "artifact",
            content: JSON.stringify(event.artifact),
          });
          break;
        }
        case "done": {
          streamCompletedRef.current = true;
          retryCountRef.current = 0;
          activeStreamIdRef.current = null;
          return {
            ...prev,
            messages: updated,
            isStreaming: false,
            streamingText: "",
          };
        }
        case "state_change":
        default:
          break;
      }

      updated[assistantIndex] = { ...message, blocks };
      return { ...prev, messages: updated, streamingText: newStreamingText };
    });
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = ipcClient.on(IpcChannel.Agent_StreamChunk, handleStreamChunk);
    return () => {
      unsubscribe();
    };
  }, [conversationId, handleStreamChunk]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return;

      const userBlock: MessageBlock = {
        id: generateId(),
        messageId: "",
        type: "text",
        content: content.trim(),
      };

      const userMessage: Message = {
        id: generateId(),
        conversationId,
        role: "user",
        blocks: [userBlock],
        createdAt: new Date().toISOString(),
      };

      userBlock.messageId = userMessage.id;

      const assistantMessage: Message = {
        id: generateId(),
        conversationId,
        role: "assistant",
        blocks: [],
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage, assistantMessage],
        isStreaming: true,
        streamingText: "",
        error: null,
      }));

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      streamCompletedRef.current = false;
      activeStreamIdRef.current = null;

      try {
        await ipcClient.message.send({
          conversationId,
          content: content.trim(),
          role: "user",
        });

        const input: AgentInput = {
          message: content.trim(),
          conversationId,
        };

        const result = await ipcClient.invoke<{ streamId?: string }>(IpcChannel.Agent_Run, {
          id: agentId,
          input,
        });

        if (result?.streamId) {
          activeStreamIdRef.current = result.streamId;
        }
      } catch (err) {
        if (signal.aborted) return;

        const errorMessage =
          err instanceof Error ? err.message : "An error occurred while processing your request.";

        setState((prev) => {
          const updated = prev.messages.map((m) => {
            if (m.id === assistantMessage.id) {
              return {
                ...m,
                blocks: [
                  {
                    id: generateId(),
                    messageId: m.id,
                    type: "error" as MessageBlock["type"],
                    content: errorMessage,
                  },
                ],
              };
            }
            return m;
          });
          return {
            ...prev,
            messages: updated,
            isStreaming: false,
            streamingText: "",
            error: errorMessage,
          };
        });

        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          setTimeout(() => {
            if (!signal.aborted) {
              sendMessage(content);
            }
          }, Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 8000));
        }
      }
    },
    [conversationId, agentId]
  );

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    retryCountRef.current = 0;
    setState((prev) => ({
      ...prev,
      isStreaming: false,
      streamingText: prev.streamingText,
    }));
  }, []);

  const retryLastMessage = useCallback(() => {
    const messages = state.messages;
    const lastUserIndex = messages.map((m) => m.role).reverse().findIndex((r) => r === "user");
    if (lastUserIndex < 0) return;

    const actualLastUserIndex = messages.length - 1 - lastUserIndex;
    const lastUserMessage = messages[actualLastUserIndex];
    const textBlock = lastUserMessage.blocks.find((b) => b.type === "text");
    if (!textBlock) return;

    retryCountRef.current = 0;

    setState((prev) => {
      const afterUser = prev.messages.slice(actualLastUserIndex + 1);
      const firstAssistantAfterUser = afterUser.find((m) => m.role === "assistant");
      const newMessages = firstAssistantAfterUser
        ? prev.messages.filter((m) => m.id !== firstAssistantAfterUser.id)
        : prev.messages;
      return { ...prev, messages: newMessages };
    });

    sendMessage(textBlock.content);
  }, [state.messages, sendMessage]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    messagesEndRef,
    sendMessage,
    stopStreaming,
    scrollToBottom,
    retryLastMessage,
    clearError,
  };
}
