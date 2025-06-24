import express from "express";
import { Queue, Worker } from "bullmq";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { FPBEEvent, RiskAlert, explainAlert } from "@fpbe-ai-risk-guardian/shared";
import Redis from "ioredis";

const app = express();
const port = 4302;

app.use(express.json());
const redis = new Redis();

// Streaming event queue (for fraud analysis)
const eventQueue = new Queue<FPBEEvent>("events", { connection: redis });

const server = createServer(app);
const wss = new WebSocketServer({ server });

const adminClients: Set<any> = new Set();

wss.on("connection", (ws) => {
  adminClients.add(ws);
  ws.on("close", () => adminClients.delete(ws));
});

// Forward alerts to admin dashboard
function sendAlertToAdmins(alert: RiskAlert) {
  const msg = JSON.stringify({ type: "alert", data: alert });
  adminClients.forEach((ws) => ws.readyState === 1 && ws.send(msg));
}

// Inference with Python AI (mocked for now)
// Replace this with actual Python integration as needed
async function runAIInference(event: FPBEEvent): Promise<RiskAlert | null> {
  // Example: flag high-value transactions
  if (event.type === "transaction" && event.amount && event.amount > 5000) {
    return {
      alertId: "alert-" + Date.now(),
      triggeredAt: Date.now(),
      eventId: event.id,
      reason: "High-value transaction anomaly",
      severity: "high",
      explainable: "Transaction exceeds normal behavior for this account.",
      resolved: false
    };
  }
  return null;
}

// Accept events from anywhere in the bank
app.post("/api/event", async (req, res) => {
  const event = req.body as FPBEEvent;
  await eventQueue.add("event", event);
  res.json({ status: "queued" });
});

// REST endpoint>(
  "events",
  async (job) => {
    const alert = await runAIInference(job.data);
    if (alert) {
      await redis.lpush("alerts", JSON.stringify(alert));
      sendAlertToAdmins(alert);
    }
  },
  { connection: redis }
);

server.listen(port, () => {
  console.log(`Risk backend running at http://localhost:${port}`);
});
