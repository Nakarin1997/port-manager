use serde::Serialize;
use std::process::Command;

#[derive(Debug, Serialize, Clone)]
pub struct PortInfo {
    pub protocol: String,
    pub local_address: String,
    pub port: u16,
    pub pid: u32,
    pub process_name: String,
    pub user: String,
    pub state: String,
    pub fd: String,
}

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub hostname: String,
    pub os: String,
    pub total_ports: usize,
}

#[derive(Debug, Serialize)]
pub struct KillResult {
    pub message: String,
    pub command_path: String,
}

/// Resolve the full command line for a given PID so it can be re-run
fn resolve_command_path(pid: u32) -> String {
    // Primary: use ps to get the FULL command line (with arguments)
    // This is the most reliable way to re-run a process
    if let Ok(output) = Command::new("/bin/ps")
        .args(["-p", &pid.to_string(), "-o", "command="])
        .output()
    {
        let command = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !command.is_empty() {
            return command;
        }
    }

    // Fallback: use lsof to find the executable from 'txt' file descriptor
    if let Ok(output) = Command::new("/usr/sbin/lsof")
        .args(["-p", &pid.to_string(), "-Ftfn"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut current_fd = String::new();

        for line in stdout.lines() {
            if let Some(fd) = line.strip_prefix('f') {
                current_fd = fd.to_string();
            } else if let Some(path) = line.strip_prefix('n') {
                if current_fd == "txt"
                    && path.starts_with('/')
                    && !path.contains("->")
                    && !path.ends_with(".dylib")
                    && !path.ends_with(".so")
                {
                    return path.to_string();
                }
            }
        }
    }

    String::new()
}

/// Parse lsof output to extract port information
fn parse_lsof_output(output: &str) -> Vec<PortInfo> {
    let mut ports: Vec<PortInfo> = Vec::new();
    let lines: Vec<&str> = output.lines().collect();

    // Skip header line
    for line in lines.iter().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }

        let process_name = parts[0].to_string();
        let pid = parts[1].parse::<u32>().unwrap_or(0);
        let user = parts[2].to_string();
        let fd = parts[3].to_string();
        let protocol = parts[7].to_string();
        let state = if parts.len() > 9 {
            parts[9].trim_matches(|c| c == '(' || c == ')').to_string()
        } else {
            "UNKNOWN".to_string()
        };

        // Parse address:port from NAME column (index 8)
        let name = parts[8];
        let (local_address, port) = if let Some(last_colon) = name.rfind(':') {
            let addr = &name[..last_colon];
            let port_str = &name[last_colon + 1..];
            let port = port_str.parse::<u16>().unwrap_or(0);
            (addr.to_string(), port)
        } else {
            (name.to_string(), 0)
        };

        if port > 0 {
            ports.push(PortInfo {
                protocol,
                local_address,
                port,
                pid,
                process_name,
                user,
                state,
                fd,
            });
        }
    }

    // Sort by port number
    ports.sort_by_key(|p| p.port);
    ports
}

#[tauri::command]
fn get_active_ports() -> Result<Vec<PortInfo>, String> {
    // Use lsof to get all TCP and UDP connections
    let tcp_output = Command::new("/usr/sbin/lsof")
        .args([
            "-iTCP",
            "-P",
            "-n",
            "-sTCP:LISTEN,ESTABLISHED,CLOSE_WAIT,TIME_WAIT",
        ])
        .output()
        .map_err(|e| format!("Failed to execute lsof for TCP: {}", e))?;

    let udp_output = Command::new("/usr/sbin/lsof")
        .args(["-iUDP", "-P", "-n"])
        .output()
        .map_err(|e| format!("Failed to execute lsof for UDP: {}", e))?;

    let tcp_str = String::from_utf8_lossy(&tcp_output.stdout);
    let udp_str = String::from_utf8_lossy(&udp_output.stdout);

    let mut ports = parse_lsof_output(&tcp_str);
    let mut udp_ports = parse_lsof_output(&udp_str);
    ports.append(&mut udp_ports);

    // Sort by port
    ports.sort_by_key(|p| p.port);

    Ok(ports)
}

#[tauri::command]
fn kill_process(pid: u32) -> Result<KillResult, String> {
    if pid == 0 {
        return Err("Invalid PID".to_string());
    }

    // Resolve the executable path BEFORE killing
    let command_path = resolve_command_path(pid);

    // First try graceful kill (SIGTERM)
    let output = Command::new("/bin/kill")
        .args(["-15", &pid.to_string()])
        .output()
        .map_err(|e| format!("Failed to execute kill: {}", e))?;

    if output.status.success() {
        Ok(KillResult {
            message: format!("Process {} terminated successfully", pid),
            command_path,
        })
    } else {
        // If SIGTERM fails, try SIGKILL
        let output = Command::new("/bin/kill")
            .args(["-9", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to force kill: {}", e))?;

        if output.status.success() {
            Ok(KillResult {
                message: format!("Process {} force killed", pid),
                command_path,
            })
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Failed to kill process {}: {}", pid, stderr))
        }
    }
}

#[tauri::command]
fn run_command(command_path: String) -> Result<String, String> {
    if command_path.is_empty() {
        return Err("No command path available for this process".to_string());
    }

    // Use shell to execute the full command (supports args, env, etc.)
    Command::new("/bin/sh")
        .args(["-c", &command_path])
        .spawn()
        .map_err(|e| format!("Failed to start process '{}': {}", command_path, e))?;

    Ok(format!("Process started successfully"))
}

#[tauri::command]
fn get_system_info() -> Result<SystemInfo, String> {
    let hostname = Command::new("/bin/hostname")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "Unknown".to_string());

    let os = Command::new("/usr/bin/sw_vers")
        .args(["-productVersion"])
        .output()
        .map(|o| format!("macOS {}", String::from_utf8_lossy(&o.stdout).trim()))
        .unwrap_or_else(|_| "macOS".to_string());

    let ports = get_active_ports().unwrap_or_default();

    Ok(SystemInfo {
        hostname,
        os,
        total_ports: ports.len(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_active_ports,
            kill_process,
            run_command,
            get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
