import { KillHistoryEntry } from "../types";

interface KillHistoryProps {
  history: KillHistoryEntry[];
  isOpen: boolean;
  onClose: () => void;
  onRerun: (entry: KillHistoryEntry) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function KillHistory({
  history,
  isOpen,
  onClose,
  onRerun,
  onRemove,
  onClearAll,
}: KillHistoryProps) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    return date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`history-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`history-panel ${isOpen ? "open" : ""}`}>
        <div className="history-header">
          <div className="history-title">
            <span className="history-title-icon">📜</span>
            <h3>Kill History</h3>
            {history.length > 0 && (
              <span className="history-count">{history.length}</span>
            )}
          </div>
          <div className="history-header-actions">
            {history.length > 0 && (
              <button
                className="history-clear-btn"
                onClick={onClearAll}
                title="Clear all history"
              >
                🗑️ Clear All
              </button>
            )}
            <button className="history-close-btn" onClick={onClose} title="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="history-list">
          {history.length === 0 ? (
            <div className="history-empty">
              <span className="history-empty-icon">🕐</span>
              <p>No killed processes yet</p>
              <p className="history-empty-sub">
                Killed processes will appear here
              </p>
            </div>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="history-item">
                <div className="history-item-info">
                  <div className="history-item-main">
                    <span className="history-item-name" title={entry.process_name}>
                      {entry.process_name}
                    </span>
                    <span className="history-item-protocol">{entry.protocol}</span>
                  </div>
                  <div className="history-item-details">
                    <span className="history-detail">
                      PID: <strong>{entry.pid}</strong>
                    </span>
                    <span className="history-detail">
                      Port: <strong>{entry.port}</strong>
                    </span>
                  </div>
                  <div className="history-item-time">
                    <span className="history-time-date">{formatDate(entry.killed_at)}</span>
                    <span className="history-time-clock">{formatTime(entry.killed_at)}</span>
                  </div>
                  {entry.command_path && (
                    <div className="history-item-path" title={entry.command_path}>
                      {entry.command_path}
                    </div>
                  )}
                </div>
                <div className="history-item-actions">
                  {entry.command_path && (
                    <button
                      className="history-rerun-btn"
                      onClick={() => onRerun(entry)}
                      title={`Re-run ${entry.process_name}`}
                    >
                      ▶
                    </button>
                  )}
                  <button
                    className="history-remove-btn"
                    onClick={() => onRemove(entry.id)}
                    title="Remove from history"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
