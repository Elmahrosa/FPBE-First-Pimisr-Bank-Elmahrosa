import React from "react";
import { RiskAlert } from "@fpbe-ai-risk-guardian/shared";

type Props = { alerts: RiskAlert[] };

export default function LiveAlertChart({ alerts }: Props) {
  // Count alerts by severity for a simple bar visualization
  const counts = alerts.reduce(
    (acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const severities: string[] = ["low", "medium", "high", "critical"];

  return (
    <div style={{ marginTop: 32 }}>
      <h3>Alert Distribution</h3>
      <div style={{ display: "flex", gap: 16 }}>
        {severities.map((sev) => (
          <div key={sev}>
            <div style={{
              width: 40,
              height: (counts[sev] || 0) * 20 + 10,
              background: sev === "critical" ? "red" : sev === "high" ? "#c62828" : sev === "medium" ? "orange" : "green",
              marginBottom: 4
            }} />
            <div style={{ textAlign: "center" }}>{sev} <br />{counts[sev] || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
