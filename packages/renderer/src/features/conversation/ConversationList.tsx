import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Trash2, MoreHorizontal } from "lucide-react";
import type { Conversation } from "../../types";

interface ConversationListProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelect: (conversation: Conversation) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function ConversationList({
  conversations,
  currentConversation,
  onSelect,
  onCreate,
  onDelete,
}: ConversationListProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Conversations
        </span>
        <button
          onClick={onCreate}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      <AnimatePresence>
        {conversations.map((conversation) => (
          <motion.div
            key={conversation.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="group relative"
          >
            <button
              onClick={() => onSelect(conversation)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                currentConversation?.id === conversation.id
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
              }`}
            >
              <MessageSquare size={16} className="shrink-0" />
              <span className="flex-1 truncate text-left">
                {conversation.title}
              </span>
            </button>

            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conversation.id);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
