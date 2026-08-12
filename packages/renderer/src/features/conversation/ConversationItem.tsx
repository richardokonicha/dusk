import { MessageSquare, Trash2 } from "lucide-react";
import type { Conversation } from "../../types";

interface ConversationItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export function ConversationItem({
  conversation,
  isActive = false,
  onClick,
  onDelete,
}: ConversationItemProps) {
  const timeAgo = getTimeAgo(conversation.updatedAt);

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50 text-foreground"
      }`}
    >
      <MessageSquare
        size={18}
        className={`shrink-0 ${isActive ? "text-accent-foreground" : "text-muted-foreground"}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conversation.title}</p>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
