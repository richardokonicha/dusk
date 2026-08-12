import { useState, useMemo } from "react";
import { FileCode, FileText, FileJson, MoreVertical, Trash2, ExternalLink, Copy, Check, Search, Filter } from "lucide-react";
import type { ArtifactMetadata, ArtifactType } from "@shared/types/file";
import { ArtifactCard } from "./ArtifactCard";

interface ArtifactListProps {
  artifacts: ArtifactMetadata[];
  agents: { id: string; name: string }[];
  onSelect?: (artifact: ArtifactMetadata) => void;
  onDelete?: (artifactId: string) => void;
  onCopy?: (artifact: ArtifactMetadata) => void;
  onOpenConversation?: (conversationId: string) => void;
}

type SortField = "date" | "name" | "size";
type SortDirection = "asc" | "desc";

export function ArtifactList({
  artifacts,
  agents,
  onSelect,
  onDelete,
  onCopy,
  onOpenConversation,
}: ArtifactListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showFilters, setShowFilters] = useState(false);

  const filteredArtifacts = useMemo(() => {
    let result = [...artifacts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query)
      );
    }

    if (agentFilter !== "all") {
      result = result.filter((a) => a.agentId === agentFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === "size") {
        cmp = a.size - b.size;
      } else {
        cmp = a.createdAt - b.createdAt;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [artifacts, searchQuery, agentFilter, sortField, sortDirection]);

  const groupedArtifacts = useMemo(() => {
    const groups: Record<string, ArtifactMetadata[]> = {};
    for (const artifact of filteredArtifacts) {
      const date = new Date(artifact.createdAt);
      const key = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(artifact);
    }
    return groups;
  }, [filteredArtifacts]);

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileCode size={48} className="mb-3 opacity-30" />
        <p className="text-sm">No artifacts yet</p>
        <p className="text-xs mt-1">Artifacts appear when agents generate output</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search artifacts..."
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
            showFilters
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Filter size={14} />
          Filters
        </button>
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as SortField)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="date">Date</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
        <button
          onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title={sortDirection === "asc" ? "Sort descending" : "Sort ascending"}
        >
          {sortDirection === "asc" ? "↑" : "↓"}
        </button>
      </div>

      {showFilters && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3">
          <Filter size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Filter by agent:</span>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {Object.entries(groupedArtifacts).map(([date, group]) => (
        <div key={date} className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            {date}
          </h3>
          {group.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              onSelect={() => onSelect?.(artifact)}
              onDelete={() => onDelete?.(artifact.id)}
              onCopy={() => onCopy?.(artifact)}
              onOpenConversation={
                artifact.conversationId ? () => onOpenConversation?.(artifact.conversationId!) : undefined
              }
            />
          ))}
        </div>
      ))}

      {filteredArtifacts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Search size={32} className="mb-2 opacity-50" />
          <span className="text-sm">No artifacts match your filters</span>
        </div>
      )}
    </div>
  );
}
