import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bot, ChevronDown, WifiOff, RefreshCw } from "lucide-react";
import type { Message } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingText: string;
  messagesEndRef: React.Ref<HTMLDivElement>;
  isLoading?: boolean;
  onRetry?: () => void;
  onStop?: () => void;
}

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDay.getTime() === today.getTime()) return "Today";
  if (msgDay.getTime() === yesterday.getTime()) return "Yesterday";
  if (now.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  }
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageList({
  messages,
  isStreaming,
  streamingText,
  messagesEndRef,
  isLoading = false,
  onRetry,
  onStop,
}: MessageListProps) {
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const threshold = 200;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const near = distanceFromBottom < threshold;
    setIsNearBottom(near);
    setShowJumpToBottom(!near);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    }
  }, []);

  useEffect(() => {
    if (isStreaming && isNearBottom) {
      scrollToBottom();
    }
  }, [isStreaming, isNearBottom, scrollToBottom]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    let currentGroup: Message[] = [];

    for (const message of messages) {
      const date = formatDateGroup(message.createdAt);
      if (date !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = date;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    }

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  }, [messages]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
      <div ref={contentRef} className="px-4 py-4">
        <div className="mx-auto max-w-3xl">
          {isLoading && messages.length === 0 && (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                  {i % 2 === 0 ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary" />
                  )}
                  <div className={`rounded-2xl px-4 py-3 space-y-2 ${i % 2 === 0 ? "rounded-tr-sm bg-primary/20" : "rounded-tl-sm border border-border bg-card"}`}>
                    <div className="space-y-1.5">
                      <div className="h-3 bg-muted rounded animate-pulse w-32" />
                      <div className="h-3 bg-muted rounded animate-pulse w-48" />
                      <div className="h-3 bg-muted rounded animate-pulse w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && (
            <AnimatePresence>
              {groupedMessages.map((group) => (
                <div key={group.date} className="mb-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex-1 border-t border-border" />
                    <span className="mx-4 text-xs text-muted-foreground font-medium">
                      {group.date}
                    </span>
                    <div className="flex-1 border-t border-border" />
                  </div>

                  <div className="space-y-4">
                    {group.messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`flex gap-3 ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.role !== "user" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                            <Bot size={18} />
                          </div>
                        )}

                        <div
                          className={`flex max-w-[85%] flex-col gap-1 ${
                            message.role === "user" ? "items-end" : "items-start"
                          }`}
                        >
                          <MessageBubble message={message} />
                          <span className="text-[10px] text-muted-foreground/70 px-1">
                            {formatTime(message.createdAt)}
                          </span>
                        </div>

                        {message.role === "user" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                            <User size={18} className="text-primary-foreground" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          )}

          {isStreaming && streamingText && onStop && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-start"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Bot size={18} />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-2.5 max-w-[85%]">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {streamingText}
                </p>
                <StreamingIndicator onCancel={onStop} />
              </div>
            </motion.div>
          )}

          {isEmpty && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bot size={40} className="text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground mb-1">No messages yet</p>
              <p className="text-xs text-muted-foreground/70 max-w-sm">
                Start a conversation by typing a message below. Your conversation history will appear here.
              </p>
            </div>
          )}

          {messages.length > 0 && !isStreaming && (
            <div className="flex items-center justify-center py-4">
              <span className="text-xs text-muted-foreground/50">
                End of conversation
              </span>
            </div>
          )}
        </div>
      </div>

      <div ref={messagesEndRef} className="h-1" />

      <AnimatePresence>
        {showJumpToBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => scrollToBottom()}
              className="rounded-full shadow-lg gap-1.5"
            >
              <ChevronDown size={14} />
              <span className="text-xs">Jump to bottom</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
