import { motion } from "framer-motion";
import { MoreHorizontal, Share2, Trash2 } from "lucide-react";

interface ConversationHeaderProps {
  title: string;
  onDelete?: () => void;
  onShare?: () => void;
}

export function ConversationHeader({
  title,
  onDelete,
  onShare,
}: ConversationHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border px-6 py-3">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-lg font-semibold truncate"
      >
        {title}
      </motion.h1>

      <div className="flex items-center gap-1">
        {onShare && (
          <button
            onClick={onShare}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Share2 size={16} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
        <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
