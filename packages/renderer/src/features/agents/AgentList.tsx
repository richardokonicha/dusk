import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import type { AgentConfig } from "@shared/types/agent";
import { AgentItem } from "./AgentItem";
import { AgentCreate } from "./AgentCreate";
import { AgentEmptyState } from "./AgentEmptyState";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

type ViewMode = "list" | "grid";
type SortField = "name" | "type";
type SortDirection = "asc" | "desc";

interface AgentListProps {
  agents: AgentConfig[];
  selectedAgentId: string | null;
  activeAgentId: string | null;
  onSelect: (agent: AgentConfig) => void;
  onCreate: (config: Omit<AgentConfig, "id">) => Promise<AgentConfig | null>;
  onUpdate: (id: string, updates: Partial<AgentConfig>) => Promise<AgentConfig | null>;
  onDelete: (id: string) => Promise<boolean>;
  isLoading: boolean;
}

export function AgentList({
  agents,
  selectedAgentId,
  activeAgentId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  isLoading,
}: AgentListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showFilters, setShowFilters] = useState(false);

  const agentTypes = useMemo(() => {
    const types = new Set(agents.map((a) => a.type));
    return Array.from(types).sort();
  }, [agents]);

  const filteredAgents = useMemo(() => {
    let result = [...agents];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query) ||
          agent.type.toLowerCase().includes(query) ||
          agent.model?.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((agent) => agent.type === typeFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "type") {
        comparison = a.type.localeCompare(b.type);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [agents, searchQuery, typeFilter, sortField, sortDirection]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSortField("name");
    setSortDirection("asc");
  };

  const hasActiveFilters = searchQuery || typeFilter !== "all";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agents</h2>
          <p className="mt-1 text-muted-foreground">
            Configure and manage AI agents for your workspace
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Agent
        </motion.button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters || hasActiveFilters ? "border-primary" : ""}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {[searchQuery, typeFilter !== "all"].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Sort by</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="name">Name</option>
                <option value="type">Type</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Direction</label>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as SortDirection)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All types</option>
                {agentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className={`grid gap-4 ${viewMode === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        agents.length === 0 ? (
          <AgentEmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 font-medium text-foreground">No agents found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )
      ) : (
        <div className={`grid gap-4 ${viewMode === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
          <AnimatePresence mode="popLayout">
            {filteredAgents.map((agent) => (
              <AgentItem
                key={agent.id}
                agent={agent}
                isSelected={selectedAgentId === agent.id}
                isActive={activeAgentId === agent.id}
                onSelect={() => onSelect(agent)}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <AgentCreate
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreate={async (config) => {
              const created = await onCreate(config);
              if (created) {
                onSelect(created);
              }
              setShowCreate(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}