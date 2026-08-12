import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StreamingIndicatorProps {
  onCancel?: () => void;
  progress?: number;
}

export function StreamingIndicator({ onCancel, progress }: StreamingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
            className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground"
          />
        ))}
      </div>

      {progress !== undefined && (
        <div className="flex-1 max-w-[100px]">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {onCancel && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          aria-label="Cancel streaming"
        >
          <XCircle size={14} />
        </Button>
      )}
    </div>
  );
}
