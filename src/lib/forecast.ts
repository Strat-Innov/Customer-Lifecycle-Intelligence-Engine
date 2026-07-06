import type { AppData, Client, ForecastFlag } from "@/types";

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
  };
}
