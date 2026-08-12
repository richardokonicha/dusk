import { motion } from "framer-motion";
import { Check, Trash2, ExternalLink } from "lucide-react";
import type { Provider } from "@shared/types";

interface ProviderCardProps {
  provider: Provider;
  onEdit?: () => void;
  onDelete?: () => void;
  onTest?: () => void;
}

export function ProviderCard({ provider, onEdit, onDelete, onTest }: ProviderCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ProviderIcon type={provider.type} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">{provider.name}</h3>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {provider.type}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{provider.baseUrl}</p>
            {provider.models.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {provider.models.slice(0, 3).map((model) => (
                  <span
                    key={model}
                    className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {model}
                  </span>
                ))}
                {provider.models.length > 3 && (
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    +{provider.models.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onTest && (
            <button
              onClick={onTest}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ProviderIcon({ type }: { type: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
