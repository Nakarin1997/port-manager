import { useState, useRef, useEffect } from "react";
import { PortInfo, ExportFormat } from "../types";

interface ExportButtonProps {
  ports: PortInfo[];
}

export function ExportButton({ ports }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exportData = (format: ExportFormat) => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "csv") {
      const headers = ["Port", "Protocol", "PID", "Process", "User", "State", "Address"];
      const rows = ports.map((p) =>
        [p.port, p.protocol, p.pid, p.process_name, p.user, p.state, p.local_address].join(",")
      );
      content = [headers.join(","), ...rows].join("\n");
      filename = `ports_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
      mimeType = "text/csv";
    } else {
      content = JSON.stringify(ports, null, 2);
      filename = `ports_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  return (
    <div className="export-wrapper" ref={dropdownRef}>
      <button
        className="export-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Export ports data (Cmd+E)"
      >
        💾 Export
      </button>
      {isOpen && (
        <div className="export-dropdown">
          <button onClick={() => exportData("csv")} className="export-option">
            <span className="export-option-icon">📄</span>
            <div>
              <span className="export-option-title">CSV</span>
              <span className="export-option-desc">Spreadsheet format</span>
            </div>
          </button>
          <button onClick={() => exportData("json")} className="export-option">
            <span className="export-option-icon">📋</span>
            <div>
              <span className="export-option-title">JSON</span>
              <span className="export-option-desc">Developer format</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
