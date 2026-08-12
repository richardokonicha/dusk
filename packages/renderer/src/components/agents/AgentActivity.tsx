import { motion, AnimatePresence } from "framer-motion";
import { AgentStatus } from "./AgentStatus";
import { formatRelativeTime } from "@shared/utils/format";
import type { Agent } from "../../types";

interface ActivityEvent {
  id: string;
  type: "started" | "completed" | "error" | "message" | "tool_use";
  description: string;
  timestamp: number;
}

interface AgentActivityProps {
  agents: Agent[];
  events?: ActivityEvent[];
}

const eventIcons: Record<string, string> = {
  started: "▶",
  completed: "✓",
  error: "✕",
  message: "💬",
  tool_use: "🔧",
};

const eventColors: Record<string, string> = {
  started: "text-blue-500 bg-blue-500/10",
  completed: "text-emerald-500 bg-emerald-500/10",
  error: "text-red-500 bg-red-500/10",
  message: "text-purple-500 bg-purple-500/10",
  tool_use: "text-amber-500 bg-amber-500/10",
};

export function AgentActivity({ agents, events = [] }: AgentActivityProps) {
  const allEvents: ActivityEvent[] = [
    ...agents.map((agent) => {
      let eventType: ActivityEvent["type"] = "completed";
      let description = `${agent.name} is idle`;
      if (agent.status === "active") {
        eventType = "started";
        description = `${agent.name} is active`;
      } else if (agent.status === "working") {
        eventType = "started";
        description = `${agent.name} is working`;
      } else if (agent.status === "error") {
        eventType = "error";
        description = `${agent.name} encountered an error`;
      }
      return {
        id: `agent-${agent.id}`,
        type: eventType,
        description,
        timestamp: agent.lastActivity ? new Date(agent.lastActivity).getTime() : Date.now() - 3600000,
      };
    }),
    ...events,
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Agent Activity
      </h3>
      <div className="space-y-2">
        <AnimatePresence>
          {allEvents.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground py-4 text-center"
            >
              No recent activity
            </motion.p>
          ) : (
            allEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs ${eventColors[event.type] || "text-muted-foreground bg-muted"}`}>
                  {eventIcons[event.type] || "•"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{event.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTime(event.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
