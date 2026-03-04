import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PortTable } from "./components/PortTable";
import { SearchBar } from "./components/SearchBar";
import { KillDialog } from "./components/KillDialog";
import { KillHistory } from "./components/KillHistory";
import { AlertPanel } from "./components/AlertPanel";
import { StatusBar } from "./components/StatusBar";
import { PortInfo, SystemInfo, KillHistoryEntry, Theme, PortAlert } from "./types";
import "./App.css";

interface KillResult {
  message: string;
  command_path: string;
}

function App() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3000);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState("all");
  const [filterProtocol, setFilterProtocol] = useState("all");

  // Kill dialog
  const [killTarget, setKillTarget] = useState<PortInfo | null>(null);
  const [isKilling, setIsKilling] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

  // Kill history
  const [killHistory, setKillHistory] = useState<KillHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem("port-manager-kill-history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Pin/Favorite Ports
  const [pinnedPorts, setPinnedPorts] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem("port-manager-pinned");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Process Grouping
  const [isGrouped, setIsGrouped] = useState(false);

  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("port-manager-theme") as Theme) || "dark";
    } catch {
      return "dark";
    }
  });

  // Port Alerts
  const [portAlerts, setPortAlerts] = useState<PortAlert[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const prevPortsRef = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("port-manager-kill-history", JSON.stringify(killHistory));
    } catch { /* ignore */ }
  }, [killHistory]);

  useEffect(() => {
    try {
      localStorage.setItem("port-manager-pinned", JSON.stringify([...pinnedPorts]));
    } catch { /* ignore */ }
  }, [pinnedPorts]);

  useEffect(() => {
    try {
      localStorage.setItem("port-manager-theme", theme);
    } catch { /* ignore */ }
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const fetchPorts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [portsData, sysInfo] = await Promise.all([
        invoke<PortInfo[]>("get_active_ports"),
        invoke<SystemInfo>("get_system_info"),
      ]);

      // Port Alerts — only track LISTEN ports (stable server processes)
      // Ignore ESTABLISHED/CLOSE_WAIT/TIME_WAIT which change constantly
      const listenPorts = portsData.filter((p) => p.state === "LISTEN");

      if (!isFirstFetch.current) {
        const currentKeys = new Set(listenPorts.map((p) => `${p.port}|${p.process_name}`));
        const prevKeys = prevPortsRef.current;

        const newAlerts: PortAlert[] = [];

        // New LISTEN ports
        for (const p of listenPorts) {
          const key = `${p.port}|${p.process_name}`;
          if (!prevKeys.has(key)) {
            newAlerts.push({
              id: `${Date.now()}-new-${p.port}-${Math.random().toString(36).slice(2, 6)}`,
              type: "new",
              port: p.port,
              process_name: p.process_name,
              detected_at: new Date().toISOString(),
            });
          }
        }

        // Gone LISTEN ports
        for (const key of prevKeys) {
          if (!currentKeys.has(key)) {
            const [portStr, ...nameParts] = key.split("|");
            newAlerts.push({
              id: `${Date.now()}-gone-${portStr}-${Math.random().toString(36).slice(2, 6)}`,
              type: "gone",
              port: parseInt(portStr, 10),
              process_name: nameParts.join("|"),
              detected_at: new Date().toISOString(),
            });
          }
        }

        if (newAlerts.length > 0 && newAlerts.length <= 10) {
          setPortAlerts((prev) => [...newAlerts, ...prev].slice(0, 50));
        }

        prevPortsRef.current = currentKeys;
      } else {
        prevPortsRef.current = new Set(listenPorts.map((p) => `${p.port}|${p.process_name}`));
        isFirstFetch.current = false;
      }

      setPorts(portsData);
      setSystemInfo(sysInfo);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to fetch ports:", error);
      showNotification(`Failed to fetch ports: ${error}`, "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const showNotification = (message: string, type: "success" | "error" | "info" | "warning") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Initial fetch
  useEffect(() => {
    fetchPorts();
  }, [fetchPorts]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchPorts, refreshInterval);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchPorts]);

  const handleClearAlerts = useCallback(() => {
    setPortAlerts([]);
    // Reset the reference to current state so cleared alerts don't reappear
    const listenPorts = ports.filter((p) => p.state === "LISTEN");
    prevPortsRef.current = new Set(listenPorts.map((p) => `${p.port}|${p.process_name}`));
  }, [ports]);

  // ⌨️ Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === "k") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      } else if (isMod && e.key === "r") {
        e.preventDefault();
        fetchPorts();
      } else if (isMod && e.key === "e") {
        e.preventDefault();
        // Trigger export — click the export button
        const exportBtn = document.querySelector(".export-btn") as HTMLButtonElement;
        exportBtn?.click();
      } else if (isMod && e.key === "g") {
        e.preventDefault();
        setIsGrouped((prev) => !prev);
      } else if (e.key === "Escape") {
        setKillTarget(null);
        setIsHistoryOpen(false);
        setIsAlertsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fetchPorts]);

  const handleKillProcess = useCallback((port: PortInfo) => {
    setKillTarget(port);
  }, []);

  const handleConfirmKill = useCallback(async () => {
    if (!killTarget) return;
    setIsKilling(true);
    try {
      const result = await invoke<KillResult>("kill_process", {
        pid: killTarget.pid,
      });

      const historyEntry: KillHistoryEntry = {
        id: `${Date.now()}-${killTarget.pid}`,
        process_name: killTarget.process_name,
        pid: killTarget.pid,
        port: killTarget.port,
        protocol: killTarget.protocol,
        killed_at: new Date().toISOString(),
        command_path: result.command_path,
      };
      setKillHistory((prev) => [historyEntry, ...prev]);

      showNotification(result.message, "success");
      setKillTarget(null);
      setTimeout(fetchPorts, 500);
    } catch (error) {
      showNotification(`${error}`, "error");
    } finally {
      setIsKilling(false);
    }
  }, [killTarget, fetchPorts]);

  const handleCancelKill = useCallback(() => {
    if (!isKilling) {
      setKillTarget(null);
    }
  }, [isKilling]);

  // Kill history handlers
  const handleRerun = useCallback(
    async (entry: KillHistoryEntry) => {
      try {
        const result = await invoke<string>("run_command", {
          commandPath: entry.command_path,
        });
        showNotification(result, "success");
        setTimeout(fetchPorts, 1000);
      } catch (error) {
        showNotification(`${error}`, "error");
      }
    },
    [fetchPorts]
  );

  const handleRemoveHistory = useCallback((id: string) => {
    setKillHistory((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const handleClearHistory = useCallback(() => {
    setKillHistory([]);
  }, []);

  // Pin handlers
  const handleTogglePin = useCallback((port: number) => {
    setPinnedPorts((prev) => {
      const next = new Set(prev);
      if (next.has(port)) {
        next.delete(port);
      } else {
        next.add(port);
      }
      return next;
    });
  }, []);

  // Filter ports
  const filteredPorts = ports.filter((port) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      port.port.toString().includes(query) ||
      port.process_name.toLowerCase().includes(query) ||
      port.pid.toString().includes(query) ||
      port.user.toLowerCase().includes(query) ||
      port.local_address.toLowerCase().includes(query);

    const matchesState =
      filterState === "all" || port.state.toUpperCase() === filterState;

    const matchesProtocol =
      filterProtocol === "all" ||
      port.protocol.toUpperCase().includes(filterProtocol);

    return matchesSearch && matchesState && matchesProtocol;
  });

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <h1>Port Manager</h1>
          </div>
          <span className="header-subtitle">
            Monitor & manage active network ports
          </span>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <span className="stat-number">{ports.length}</span>
            <span className="stat-label">Total Ports</span>
          </div>
          <div className="stat-card stat-listen">
            <span className="stat-number">
              {ports.filter((p) => p.state === "LISTEN").length}
            </span>
            <span className="stat-label">Listening</span>
          </div>
          <div className="stat-card stat-established">
            <span className="stat-number">
              {ports.filter((p) => p.state === "ESTABLISHED").length}
            </span>
            <span className="stat-label">Established</span>
          </div>
          {pinnedPorts.size > 0 && (
            <div className="stat-card stat-pinned">
              <span className="stat-number">{pinnedPorts.size}</span>
              <span className="stat-label">Pinned</span>
            </div>
          )}
          <button
            className={`history-toggle-btn ${killHistory.length > 0 ? "has-items" : ""}`}
            onClick={() => setIsHistoryOpen(true)}
            title="Kill History"
          >
            <span className="history-toggle-icon">📜</span>
            {killHistory.length > 0 && (
              <span className="history-badge">{killHistory.length}</span>
            )}
          </button>
          <button
            className={`history-toggle-btn ${portAlerts.length > 0 ? "has-items alert-bell" : ""}`}
            onClick={() => setIsAlertsOpen(true)}
            title="Port Alerts"
          >
            <span className="history-toggle-icon">🔔</span>
            {portAlerts.length > 0 && (
              <span className="history-badge alert-badge">{portAlerts.length}</span>
            )}
          </button>
        </div>
      </header>

      {/* Search & Filters */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterState={filterState}
        onFilterStateChange={setFilterState}
        filterProtocol={filterProtocol}
        onFilterProtocolChange={setFilterProtocol}
        totalPorts={ports.length}
        filteredCount={filteredPorts.length}
        isGrouped={isGrouped}
        onToggleGrouped={() => setIsGrouped((prev) => !prev)}
        ports={filteredPorts}
      />

      {/* Port Table */}
      <PortTable
        ports={filteredPorts}
        isLoading={isLoading}
        onKillProcess={handleKillProcess}
        pinnedPorts={pinnedPorts}
        onTogglePin={handleTogglePin}
        isGrouped={isGrouped}
      />

      {/* Status Bar */}
      <StatusBar
        systemInfo={systemInfo}
        lastRefresh={lastRefresh}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh((prev) => !prev)}
        onManualRefresh={fetchPorts}
        isRefreshing={isRefreshing}
        refreshInterval={refreshInterval}
        onChangeInterval={setRefreshInterval}
        theme={theme}
        onChangeTheme={setTheme}
      />

      {/* Kill Dialog */}
      <KillDialog
        port={killTarget}
        isOpen={!!killTarget}
        isKilling={isKilling}
        onConfirm={handleConfirmKill}
        onCancel={handleCancelKill}
      />

      {/* Kill History Panel */}
      <KillHistory
        history={killHistory}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRerun={handleRerun}
        onRemove={handleRemoveHistory}
        onClearAll={handleClearHistory}
      />

      {/* Alert Panel */}
      <AlertPanel
        alerts={portAlerts}
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        onClear={handleClearAlerts}
      />

      {/* Notification Toast */}
      {notification && (
        <div className={`notification ${notification.type} slide-in`}>
          <span className="notification-icon">
            {notification.type === "success" ? "✓" : notification.type === "error" ? "✕" : notification.type === "warning" ? "⚠" : "ℹ"}
          </span>
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default App;
