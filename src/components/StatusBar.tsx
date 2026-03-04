import { useState } from "react";
import { SystemInfo, Theme } from "../types";

interface StatusBarProps {
  systemInfo: SystemInfo | null;
  lastRefresh: Date | null;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onManualRefresh: () => void;
  isRefreshing: boolean;
  refreshInterval: number;
  onChangeInterval: (interval: number) => void;
  theme: Theme;
  onChangeTheme: (theme: Theme) => void;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "light", label: "Light", icon: "☀️" },
  { value: "purple", label: "Purple", icon: "💜" },
  { value: "ocean", label: "Ocean", icon: "🌊" },
];

const SHORTCUTS = [
  { keys: "Cmd+K", action: "Focus search" },
  { keys: "Cmd+R", action: "Refresh" },
  { keys: "Cmd+E", action: "Export" },
  { keys: "Cmd+G", action: "Toggle grouping" },
  { keys: "Esc", action: "Close dialog" },
];

export function StatusBar({
  systemInfo,
  lastRefresh,
  autoRefresh,
  onToggleAutoRefresh,
  onManualRefresh,
  isRefreshing,
  refreshInterval,
  onChangeInterval,
  theme,
  onChangeTheme,
}: StatusBarProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  const formatTime = (date: Date | null) => {
    if (!date) return "--:--:--";
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <>
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
          {/* Theme Selector */}
          <div className="theme-selector">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`theme-btn ${theme === opt.value ? "active" : ""}`}
                onClick={() => onChangeTheme(opt.value)}
                title={`${opt.label} theme`}
              >
                {opt.icon}
              </button>
            ))}
          </div>

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
              title="Refresh now (Cmd+R)"
            >
              ↻ Refresh
            </button>
          </div>

          <button
            className="shortcuts-hint-btn"
            onClick={() => setShowShortcuts(true)}
            title="Show keyboard shortcuts"
          >
            ⌨️
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-header">
              <h3>⌨️ Keyboard Shortcuts</h3>
              <button
                className="shortcuts-close"
                onClick={() => setShowShortcuts(false)}
              >
                ✕
              </button>
            </div>
            <div className="shortcuts-list">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="shortcut-item">
                  <kbd className="shortcut-key">{s.keys}</kbd>
                  <span className="shortcut-action">{s.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
