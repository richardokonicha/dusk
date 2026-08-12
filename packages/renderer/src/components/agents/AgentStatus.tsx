import { motion } from "framer-motion";
import type { AgentStatus } from "../../types";

interface AgentStatusProps {
  status: AgentStatus;
  label?: string;
  size?: "sm" | "md" | "lg";
}

const statusConfig = {
  idle: {
    color: "bg-muted-foreground",
    label: "Idle",
    description: "Agent is idle and ready",
  },
  active: {
    color: "bg-blue-500",
    label: "Active",
    description: "Agent is actively processing",
  },
  working: {
    color: "bg-yellow-500",
    label: "Working",
    description: "Agent is working on a task",
  },
  error: {
    color: "bg-red-500",
    label: "Error",
    description: "Agent encountered an error",
  },
  completed: {
    color: "bg-emerald-500",
    label: "Completed",
    description: "Agent finished successfully",
  },
  failed: {
    color: "bg-red-600",
    label: "Failed",
    description: "Agent failed to complete",
  },
};

const sizeClasses = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

export function AgentStatus({ status, label, size = "md" }: AgentStatusProps) {
  const config = statusConfig[status] || statusConfig.idle;

  return (
    <div
      className="group flex cursor-help items-center gap-2"
      title={config.description}
    >
      <div className="relative">
        <span
          className={`inline-block rounded-full ${sizeClasses[size]} ${config.color}`}
        />
        {status === "working" && (
          <motion.span
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute inset-0 rounded-full ${sizeClasses[size]} ${config.color}`}
          />
        )}
        {status === "active" && (
          <motion.span
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute inset-0 rounded-full ${sizeClasses[size]} ${config.color}`}
          />
        )}
      </div>
      <span className="text-xs text-muted-foreground">{label || config.label}</span>
    </div>
  );
}
