import { SystemInfo } from "../types";

interface StatusBarProps {
  systemInfo: SystemInfo | null;
  lastRefresh: Date | null;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onManualRefresh: () => void;
  isRefreshing: boolean;
  refreshInterval: number;
  onChangeInterval: (interval: number) => void;
}

export function StatusBar({
  systemInfo,
  lastRefresh,
  autoRefresh,
  onToggleAutoRefresh,
  onManualRefresh,
  isRefreshing,
  refreshInterval,
  onChangeInterval,
}: StatusBarProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return "--:--:--";
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="status-bar">
      <div className="status-left">
        <div className="status-item">
          <span className="status-label">Host</span>
          <span className="status-value">{systemInfo?.hostname || "..."}</span>
        </div>
        <div className="status-item">
          <span className="status-label">OS</span>
          <span className="status-value">{systemInfo?.os || "..."}</span>
        </div>
      </div>

      <div className="status-right">
        <div className="status-item">
          <span className="status-label">Last refresh</span>
          <span className="status-value">{formatTime(lastRefresh)}</span>
        </div>

        <div className="refresh-controls">
          <select
            value={refreshInterval}
            onChange={(e) => onChangeInterval(Number(e.target.value))}
            className="interval-select"
            title="Refresh interval"
          >
            <option value={1000}>1s</option>
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
          </select>

          <button
            className={`auto-refresh-btn ${autoRefresh ? "active" : ""}`}
            onClick={onToggleAutoRefresh}
            title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
          >
            <span className={`refresh-icon ${autoRefresh && isRefreshing ? "spinning" : ""}`}>
              ⟳
            </span>
            {autoRefresh ? "ON" : "OFF"}
          </button>

          <button
            className="manual-refresh-btn"
            onClick={onManualRefresh}
            disabled={isRefreshing}
            title="Refresh now"
          >
            ↻ Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
