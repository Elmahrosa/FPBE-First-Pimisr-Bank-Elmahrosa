import React from "react";
import { RiskAlert } from "@fpbe-ai-risk-guardian/shared";

type Props = {
  alert: RiskAlert;
  onClose: () => void;
};

export default function AlertModal({ alert, onClose }: Props) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div style={{ background: "#fff", padding: 24, borderRadius: 8, maxWidth: 400 }}>
        <h2>Alert Details</h2>
        <div><b>ID:</b> {alert.alertId}</div>
        <div><b>Severity:</b> {alert.severity}</div>
        <div><b>Reason:</b> {alert.reason}</div>
        <div><b>Explainable:</b> {alert.explainable}</div>
        <div><b>Time:</b> {new Date(alert.triggeredAt).toLocaleString()}</div>
        <button onClick={onClose} style={{ marginTop: 16 }}>Close</button>
      </div>
    </div>
  );
}
