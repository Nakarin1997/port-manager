export interface PortInfo {
  protocol: string;
  local_address: string;
  port: number;
  pid: number;
  process_name: string;
  user: string;
  state: string;
  fd: string;
}

export interface SystemInfo {
  hostname: string;
  os: string;
  total_ports: number;
}

export type SortField =
  | "port"
  | "pid"
  | "process_name"
  | "protocol"
  | "state"
  | "user";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface KillHistoryEntry {
  id: string;
  process_name: string;
  pid: number;
  port: number;
  protocol: string;
  killed_at: string;
  command_path: string;
}

export type Theme = "dark" | "light" | "purple" | "ocean";

export type ExportFormat = "csv" | "json";

export interface PortAlert {
  id: string;
  type: "new" | "gone";
  port: number;
  process_name: string;
  detected_at: string;
}
