import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PortTable } from "./components/PortTable";
import { SearchBar } from "./components/SearchBar";
import { KillDialog } from "./components/KillDialog";
import { StatusBar } from "./components/StatusBar";
import { PortInfo, SystemInfo } from "./types";
import "./App.css";

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
    type: "success" | "error";
  } | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPorts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [portsData, sysInfo] = await Promise.all([
        invoke<PortInfo[]>("get_active_ports"),
        invoke<SystemInfo>("get_system_info"),
      ]);
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

  const showNotification = (message: string, type: "success" | "error") => {
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

  const handleKillProcess = useCallback((port: PortInfo) => {
    setKillTarget(port);
  }, []);

  const handleConfirmKill = useCallback(async () => {
    if (!killTarget) return;
    setIsKilling(true);
    try {
      const result = await invoke<string>("kill_process", {
        pid: killTarget.pid,
      });
      showNotification(result, "success");
      setKillTarget(null);
      // Refresh after kill
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
      />

      {/* Port Table */}
      <PortTable
        ports={filteredPorts}
        isLoading={isLoading}
        onKillProcess={handleKillProcess}
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
      />

      {/* Kill Dialog */}
      <KillDialog
        port={killTarget}
        isOpen={!!killTarget}
        isKilling={isKilling}
        onConfirm={handleConfirmKill}
        onCancel={handleCancelKill}
      />

      {/* Notification Toast */}
      {notification && (
        <div className={`notification ${notification.type} slide-in`}>
          <span className="notification-icon">
            {notification.type === "success" ? "✓" : "✕"}
          </span>
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default App;
