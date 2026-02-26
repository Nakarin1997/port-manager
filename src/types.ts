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

export type SortField = 'port' | 'pid' | 'process_name' | 'protocol' | 'state' | 'user';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}
