import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { RiskAlert, explainAlert } from "@fpbe-ai-risk-guardian/shared";
import LiveAlertChart from "../components/LiveAlertChart";
import AlertModal from "../components/AlertModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  const { data: alerts, mutate } = useSWR<RiskAlert[]>("/api/alerts", fetcher, { refreshInterval: 5000 });
  const [liveAlerts, setLiveAlerts] = useState<RiskAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4302");
    ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.type === "alert") setLiveAlerts((a) => [parsed.data, ...a]);
    };
    return () => ws.close();
  }, []);

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      <h1>FPBE AI Risk Guardian Dashboard</h1>
      <LiveAlertChart alerts={alerts || []} />
      <h2>Live Alerts</h2>
      {liveAlerts.length === 0 && <div>No live alerts.</div>}
      <ul>
        {liveAlerts.map((alert) => (
          <li
            key={alert.alertId}
            style={{ color: "#c62828", marginBottom: 8, cursor: "pointer" }}
            onClick={() => setSelectedAlert(alert)}
          >
            {explainAlert(alert)}
          </li>
        ))}
      </ul>
      <h2>All Alerts</h2>
      {!alerts ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {alerts.map((alert) => (
            <li
              key={alert.alertId}
              style={{ color: alert.severity === "critical" ? "red" : "black", cursor: "pointer" }}
              onClick={() => setSelectedAlert(alert)}
            >
              {explainAlert(alert)}
            </li>
          ))}
        </ul>
      )}
      {selectedAlert && <AlertModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />}
    </div>
  );
            }
