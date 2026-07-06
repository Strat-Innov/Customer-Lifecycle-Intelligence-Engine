import type { AppData, Client, ForecastFlag, Notification } from "@/types";

const INACTIVITY_DAYS = 30;

export function isApproaching10(client: Client): boolean {
  return client.payment_percentage >= 8 && client.payment_percentage < 10;
}

export function isNearCreq(client: Client): boolean {
  const missing = client.documentation_status.missing.length;
  return missing >= 1 && missing <= 2;
}

export function isInactive(client: Client, data: AppData): boolean {
  const history = data.payment_history
    .filter((h) => h.client_id === client.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (history.length === 0) return false;

  const last = history[history.length - 1];
  const daysSinceLast = (Date.now() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLast < INACTIVITY_DAYS) return false;

  // No increase in payment_percentage across the last 30+ days window
  const cutoff = Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
  const recentEntries = history.filter((h) => new Date(h.date).getTime() >= cutoff);
  if (recentEntries.length === 0) return true;

  const maxRecent = Math.max(...recentEntries.map((h) => h.payment_percentage));
  const minRecent = Math.min(...recentEntries.map((h) => h.payment_percentage));
  return maxRecent - minRecent <= 0;
}

const PROJECTION_WINDOW_DAYS = 30;

/**
 * Projects whether a client is on pace to reach 10% within the next 30 days,
 * based on the real rate of change between their earliest and latest upload
 * history points. Returns null when there isn't enough data (fewer than two
 * distinct-dated points, or the trend is flat/declining) to project from.
 */
export function daysUntilTenPercent(client: Client, data: AppData): number | null {
  if (client.payment_percentage >= 10) return null;

  const history = data.payment_history
    .filter((h) => h.client_id === client.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (history.length < 2) return null;

  const earliest = history[0];
  const latest = history[history.length - 1];
  const daysElapsed = (new Date(latest.date).getTime() - new Date(earliest.date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysElapsed <= 0) return null;

  const dailyRate = (latest.payment_percentage - earliest.payment_percentage) / daysElapsed;
  if (dailyRate <= 0) return null;

  const daysNeeded = (10 - latest.payment_percentage) / dailyRate;
  return daysNeeded;
}

export function isProjectedWithinNextMonth(client: Client, data: AppData): boolean {
  const days = daysUntilTenPercent(client, data);
  return days !== null && days <= PROJECTION_WINDOW_DAYS;
}

/**
 * Fires a "Projected 10% (Next 30 Days)" alert once per client — the first
 * time they qualify — using client.projected_10_alert_sent as the guard so
 * re-uploading the same trend data every day doesn't re-notify endlessly.
 */
export function generateProjectionAlerts(data: AppData): {
  clients: Client[];
  newNotifications: Notification[];
} {
  const today = new Date().toISOString();
  const alertEmail = data.settings.alert_email;
  const newNotifications: Notification[] = [];

  const clients = data.clients.map((client) => {
    if (!client.projected_10_alert_sent && isProjectedWithinNextMonth(client, data)) {
      newNotifications.push({
        id: crypto.randomUUID(),
        client_id: client.id,
        client_name: client.name,
        milestone: "Projected 10% (Next 30 Days)",
        payment_percentage: client.payment_percentage,
        timestamp: today,
        email_sent: false,
        sent_to: alertEmail,
        kind: "forecast",
      });
      return { ...client, projected_10_alert_sent: true };
    }
    return client;
  });

  return { clients, newNotifications };
}

export function computeForecastFlags(data: AppData): ForecastFlag[] {
  const now = new Date().toISOString();
  const flags: ForecastFlag[] = [];

  for (const client of data.clients) {
    if (isApproaching10(client)) {
      flags.push({ client_id: client.id, type: "approaching_10", generated_date: now });
    }
    if (isNearCreq(client)) {
      flags.push({ client_id: client.id, type: "near_creq", generated_date: now });
    }
    if (isInactive(client, data)) {
      flags.push({ client_id: client.id, type: "inactive", generated_date: now });
    }
    if (isProjectedWithinNextMonth(client, data)) {
      flags.push({ client_id: client.id, type: "projected_10_next_30", generated_date: now });
    }
  }
  return flags;
}

export function groupForecastByType(data: AppData) {
  const flags = computeForecastFlags(data);
  const byId = (id: string) => data.clients.find((c) => c.id === id)!;

  return {
    approaching10: flags.filter((f) => f.type === "approaching_10").map((f) => byId(f.client_id)),
    nearCreq: flags.filter((f) => f.type === "near_creq").map((f) => byId(f.client_id)),
    inactive: flags.filter((f) => f.type === "inactive").map((f) => byId(f.client_id)),
    projected10Next30: flags.filter((f) => f.type === "projected_10_next_30").map((f) => byId(f.client_id)),
  };
}
