import { useCallback } from "react";
import { PortInfo } from "../types";
import { ExportButton } from "./ExportButton";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterState: string;
  onFilterStateChange: (state: string) => void;
  filterProtocol: string;
  onFilterProtocolChange: (protocol: string) => void;
  totalPorts: number;
  filteredCount: number;
  isGrouped: boolean;
  onToggleGrouped: () => void;
  ports: PortInfo[];
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  filterState,
  onFilterStateChange,
  filterProtocol,
  onFilterProtocolChange,
  totalPorts,
  filteredCount,
  isGrouped,
  onToggleGrouped,
  ports,
}: SearchBarProps) {
  const handleClear = useCallback(() => {
    onSearchChange("");
    onFilterStateChange("all");
    onFilterProtocolChange("all");
  }, [onSearchChange, onFilterStateChange, onFilterProtocolChange]);

  const hasFilters =
    searchQuery !== "" || filterState !== "all" || filterProtocol !== "all";

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          id="search-input"
          placeholder="Search by port, process name, PID, or user... (Cmd+K)"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
        {hasFilters && (
          <button className="clear-btn" onClick={handleClear} title="Clear all filters">
            ✕
          </button>
        )}
      </div>

      <div className="filter-group">
        <select
          value={filterState}
          onChange={(e) => onFilterStateChange(e.target.value)}
          className="filter-select"
        >
          <option value="all">All States</option>
          <option value="LISTEN">LISTEN</option>
          <option value="ESTABLISHED">ESTABLISHED</option>
          <option value="CLOSE_WAIT">CLOSE_WAIT</option>
          <option value="TIME_WAIT">TIME_WAIT</option>
        </select>

        <select
          value={filterProtocol}
          onChange={(e) => onFilterProtocolChange(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Protocols</option>
          <option value="TCP">TCP</option>
          <option value="UDP">UDP</option>
        </select>

        <button
          className={`group-toggle-btn ${isGrouped ? "active" : ""}`}
          onClick={onToggleGrouped}
          title={`${isGrouped ? "Disable" : "Enable"} process grouping (Cmd+G)`}
        >
          🏷️ {isGrouped ? "Grouped" : "Group"}
        </button>

        <ExportButton ports={ports} />

        <div className="result-count">
          <span className="count-badge">
            {filteredCount}
          </span>
          <span className="count-label">
            {filteredCount !== totalPorts ? ` / ${totalPorts}` : ""} ports
          </span>
        </div>
      </div>
    </div>
  );
}
