// Shared alert schema, types, and utility functions

export type EventType = 'transaction' | 'login' | 'account_update' | 'payment';

export interface FPBEEvent {
  id: string;
  type: EventType;
  accountId: string;
  timestamp: number;
  amount?: number;
  location?: string;
  deviceId?: string;
  metadata?: Record<string, any>;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RiskAlert {
  alertId: string;
  triggeredAt: number;
  eventId: string;
  reason: string;
  severity: AlertSeverity;
  explainable: string;
  resolved: boolean;
}

export function explainAlert(alert: RiskAlert): string {
  return `[${alert.severity}] ${alert.reason}: ${alert.explainable}`;
}
