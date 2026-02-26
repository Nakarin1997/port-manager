import { PortInfo } from "../types";

interface KillDialogProps {
  port: PortInfo | null;
  isOpen: boolean;
  isKilling: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function KillDialog({
  port,
  isOpen,
  isKilling,
  onConfirm,
  onCancel,
}: KillDialogProps) {
  if (!isOpen || !port) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <span className="dialog-icon">⚠️</span>
          <h3>Kill Process</h3>
        </div>
        <div className="dialog-body">
          <p>Are you sure you want to kill this process?</p>
          <div className="dialog-details">
            <div className="detail-row">
              <span className="detail-label">Process</span>
              <span className="detail-value">{port.process_name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">PID</span>
              <span className="detail-value">{port.pid}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Port</span>
              <span className="detail-value">{port.port}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">User</span>
              <span className="detail-value">{port.user}</span>
            </div>
          </div>
          <p className="dialog-warning">
            This action cannot be undone. The process will be terminated.
          </p>
        </div>
        <div className="dialog-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={isKilling}>
            Cancel
          </button>
          <button className="btn-kill" onClick={onConfirm} disabled={isKilling}>
            {isKilling ? (
              <>
                <span className="loading-spinner-small" /> Killing...
              </>
            ) : (
              "Kill Process"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
