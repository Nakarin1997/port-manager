import { PortAlert } from "../types";

interface AlertPanelProps {
  alerts: PortAlert[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
}

export function AlertPanel({
  alerts,
  isOpen,
  onClose,
  onClear,
}: AlertPanelProps) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <>
      <div
        className={`alert-panel-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />
      <div className={`alert-panel ${isOpen ? "open" : ""}`}>
        <div className="alert-panel-header">
          <div className="alert-panel-title">
            <span>🔔</span>
            <h3>Port Alerts</h3>
            {alerts.length > 0 && (
              <span className="alert-panel-count">{alerts.length}</span>
            )}
          </div>
          <div className="alert-panel-header-actions">
            {alerts.length > 0 && (
              <button className="alert-clear-btn" onClick={onClear}>
                🗑️ Clear
              </button>
            )}
            <button className="alert-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className="alert-panel-list">
          {alerts.length === 0 ? (
            <div className="alert-panel-empty">
              <span className="alert-panel-empty-icon">🔔</span>
              <p>No alerts yet</p>
              <p className="alert-panel-empty-sub">
                Port changes will appear here
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-panel-item ${alert.type === "new" ? "alert-item-new" : "alert-item-gone"}`}
              >
                <span className="alert-panel-item-icon">
                  {alert.type === "new" ? "🟢" : "🟡"}
                </span>
                <div className="alert-panel-item-info">
                  <span className="alert-panel-item-text">
                    Port <strong>{alert.port}</strong>{" "}
                    {alert.type === "new" ? "opened" : "closed"}
                  </span>
                  <span className="alert-panel-item-process">
                    {alert.process_name}
                  </span>
                </div>
                <span className="alert-panel-item-time">
                  {formatTime(alert.detected_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
