import { useState, useCallback } from "react";
import { PortInfo, SortConfig, SortField } from "../types";

interface PortTableProps {
  ports: PortInfo[];
  isLoading: boolean;
  onKillProcess: (port: PortInfo) => void;
}

export function PortTable({ ports, isLoading, onKillProcess }: PortTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "port",
    direction: "asc",
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSort = useCallback(
    (field: SortField) => {
      setSortConfig((prev) => ({
        field,
        direction:
          prev.field === field && prev.direction === "asc" ? "desc" : "asc",
      }));
    },
    []
  );

  const sortedPorts = [...ports].sort((a, b) => {
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    const field = sortConfig.field;
    if (field === "port" || field === "pid") {
      return (a[field] - b[field]) * dir;
    }
    return a[field].localeCompare(b[field]) * dir;
  });

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const getStateClass = (state: string) => {
    switch (state.toUpperCase()) {
      case "LISTEN":
        return "state-listen";
      case "ESTABLISHED":
        return "state-established";
      case "CLOSE_WAIT":
      case "TIME_WAIT":
        return "state-waiting";
      default:
        return "state-other";
    }
  };

  if (isLoading && ports.length === 0) {
    return (
      <div className="table-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Scanning ports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="port-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("port")} className="sortable">
              Port {getSortIcon("port")}
            </th>
            <th onClick={() => handleSort("protocol")} className="sortable">
              Protocol {getSortIcon("protocol")}
            </th>
            <th onClick={() => handleSort("pid")} className="sortable">
              PID {getSortIcon("pid")}
            </th>
            <th onClick={() => handleSort("process_name")} className="sortable">
              Process {getSortIcon("process_name")}
            </th>
            <th onClick={() => handleSort("user")} className="sortable">
              User {getSortIcon("user")}
            </th>
            <th onClick={() => handleSort("state")} className="sortable">
              State {getSortIcon("state")}
            </th>
            <th>Address</th>
            <th className="action-col">Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedPorts.length === 0 ? (
            <tr>
              <td colSpan={8} className="empty-state">
                <span className="empty-icon">🔍</span>
                <span>No matching ports found</span>
              </td>
            </tr>
          ) : (
            sortedPorts.map((port, index) => (
              <tr
                key={`${port.pid}-${port.port}-${port.fd}-${index}`}
                className="port-row fade-in"
                style={{ animationDelay: `${index * 0.02}s` }}
              >
                <td className="port-number">
                  <span
                    className={`copy-button ${copiedId === `port-${port.port}-${index}` ? "copied" : ""}`}
                    onClick={() =>
                      handleCopy(
                        port.port.toString(),
                        `port-${port.port}-${index}`
                      )
                    }
                    title="Copy port"
                  >
                    {port.port}
                  </span>
                </td>
                <td>
                  <span className="protocol-badge">{port.protocol}</span>
                </td>
                <td className="pid-cell">
                  <span
                    className={`copy-button ${copiedId === `pid-${port.pid}-${index}` ? "copied" : ""}`}
                    onClick={() =>
                      handleCopy(
                        port.pid.toString(),
                        `pid-${port.pid}-${index}`
                      )
                    }
                    title="Copy PID"
                  >
                    {port.pid}
                  </span>
                </td>
                <td className="process-name" title={port.process_name}>
                  {port.process_name}
                </td>
                <td className="user-cell">{port.user}</td>
                <td>
                  <span className={`state-badge ${getStateClass(port.state)}`}>
                    {port.state}
                  </span>
                </td>
                <td className="address-cell" title={port.local_address}>
                  {port.local_address}
                </td>
                <td className="action-col">
                  <button
                    className="kill-btn"
                    onClick={() => onKillProcess(port)}
                    title={`Kill process ${port.process_name} (PID: ${port.pid})`}
                  >
                    <span className="kill-icon">✕</span>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
