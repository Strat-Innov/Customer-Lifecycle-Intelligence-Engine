import type { AppData, Client, ImportBaseline, ImportRecord, Notification, SalesReportRow } from "@/types";
import { processSalesReportRows } from "@/lib/salesReport";
import { generateProjectionAlerts } from "@/lib/forecast";
import { isCreqComplete } from "@/lib/milestones";

export interface ApplyImportInput {
  fileName: string;
  rows: SalesReportRow[];
  /** Defaults to now. */
  importedAt?: string;
}

export interface ApplyImportResult {
  data: AppData;
  record: ImportRecord;
  customersProcessed: number;
  newNotifications: Notification[];
}

/**
 * Applies a parsed Sales Report to the data and records it as an import, so it
 * can be listed and removed later.
 */
export function applyImport(data: AppData, input: ApplyImportInput): ApplyImportResult {
  const importId = crypto.randomUUID();
  const importedAt = input.importedAt ?? new Date().toISOString();

  const result = processSalesReportRows(input.rows, data, { now: importedAt, importId });
  const projection = generateProjectionAlerts(result.data, importId);

  const record: ImportRecord = {
    id: importId,
    file_name: input.fileName,
    imported_at: importedAt,
    row_count: input.rows.length,
    customers_processed: result.customersProcessed,
    rows: input.rows,
  };

  return {
    data: {
      ...result.data,
      clients: projection.clients,
      notifications: [...projection.newNotifications, ...result.data.notifications],
      imports: [...data.imports, record],
    },
    record,
    customersProcessed: result.customersProcessed,
    newNotifications: [...result.newNotifications, ...projection.newNotifications],
  };
}

const milestoneKey = (n: Pick<Notification, "client_id" | "milestone">) => `${n.client_id}::${n.milestone}`;

/**
 * Removes an import and rebuilds payment data as if that file had never been
 * imported: the baseline (if any) plus every remaining import, replayed in its
 * original order and dated by its original import time.
 *
 * Preserved across the rebuild:
 * - client ids, so links and notifications keep pointing at the same client
 * - documentation status, which is managed by hand, not by imports
 * - notifications from other imports and from documentation edits, as long as
 *   the client still exists and still holds that milestone
 *
 * Clients that only existed because of the removed file are dropped, along with
 * their notifications. Milestones that are now first reached by a later import
 * get a notification dated to that import; it is not emailed again.
 */
export function removeImport(data: AppData, importId: string): AppData {
  if (!data.imports.some((i) => i.id === importId)) {
    throw new Error(`Import ${importId} not found`);
  }
  const remaining = data.imports.filter((i) => i.id !== importId);
  const currentById = new Map(data.clients.map((c) => [c.id, c]));

  let state: AppData = {
    ...data,
    clients: baselineClients(data.baseline, currentById),
    payment_history: data.baseline ? [...data.baseline.payment_history] : [],
    contract_payment_history: data.baseline ? [...data.baseline.contract_payment_history] : [],
    notifications: [],
    imports: remaining,
  };

  const replayed: Notification[] = [];
  for (const record of remaining) {
    const result = processSalesReportRows(record.rows, state, {
      now: record.imported_at,
      importId: record.id,
      carryOver: data.clients,
    });
    state = result.data;
    replayed.push(...result.newNotifications);
  }

  // CREQ depends only on documents, so it holds regardless of which import touched the client.
  const clients = state.clients.map((c) =>
    isCreqComplete(c.documentation_status) && !c.milestones_reached.includes("CREQ")
      ? { ...c, milestones_reached: [...c.milestones_reached, "CREQ"] }
      : c
  );
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const kept = data.notifications.filter((n) => {
    if (n.import_id === importId) return false;
    const client = clientById.get(n.client_id);
    if (!client) return false;
    return n.kind === "forecast" || client.milestones_reached.includes(n.milestone);
  });

  const covered = new Set(kept.map(milestoneKey));
  const recovered = replayed.filter((n) => !covered.has(milestoneKey(n)));

  const notifications = [...kept, ...recovered].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // The one-time projection alert guard follows the alerts that survived.
  const hasForecastAlert = new Set(kept.filter((n) => n.kind === "forecast").map((n) => n.client_id));

  return {
    ...state,
    clients: clients.map((c) => ({ ...c, projected_10_alert_sent: hasForecastAlert.has(c.id) })),
    notifications,
  };
}

/** Baseline clients, with the hand-managed fields taken from their current state. */
function baselineClients(baseline: ImportBaseline | null, currentById: Map<string, Client>): Client[] {
  if (!baseline) return [];
  return baseline.clients.map((c) => {
    const current = currentById.get(c.id);
    return current ? { ...c, documentation_status: current.documentation_status } : { ...c };
  });
}

/**
 * Snapshot of payment data that predates import tracking, or null when there
 * is none. Taken once, when data from an earlier release is first loaded.
 */
export function captureBaseline(data: Pick<AppData, "clients" | "payment_history" | "contract_payment_history">): ImportBaseline | null {
  if (data.clients.length === 0) return null;
  return {
    captured_at: new Date().toISOString(),
    clients: data.clients,
    payment_history: data.payment_history,
    contract_payment_history: data.contract_payment_history,
  };
}
