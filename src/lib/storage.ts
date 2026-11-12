import type { AppData } from "@/types";
import { captureBaseline } from "@/lib/imports";
import { assignAliases } from "@/lib/customerAliases";

/**
 * Persistence key for the current brand (CLIE).
 *
 * Kept as a literal rather than derived from `@/lib/branding` so a future
 * rename cannot silently orphan persisted data.
 */
const STORAGE_KEY = "clie_data_v1";

/**
 * Keys written by earlier releases, newest first. On load these are migrated
 * into `STORAGE_KEY` once and then removed, so existing users keep their data
 * across the "Filinvest Milestone Tracker" -> "CLIE" rename.
 */
const LEGACY_STORAGE_KEYS = ["filinvest_milestone_tracker_data_v1"] as const;

const DEFAULT_ALERT_EMAIL = "joseph.bagadiong@filinvestcity.com";

const EMPTY_DATA: AppData = {
  clients: [],
  payment_history: [],
  contract_payment_history: [],
  notifications: [],
  settings: { alert_email: DEFAULT_ALERT_EMAIL, hide_customer_names: true },
  imports: [],
  baseline: null,
  customer_aliases: {},
};

function parseData(raw: string): AppData {
  const parsed = JSON.parse(raw) as AppData;
  if (!parsed.settings) parsed.settings = { alert_email: DEFAULT_ALERT_EMAIL, hide_customer_names: true };
  // Names are hidden unless someone has explicitly chosen to show them.
  if (parsed.settings.hide_customer_names === undefined) parsed.settings.hide_customer_names = true;
  // Data from before import tracking: keep what's there as a non-removable baseline.
  if (!parsed.imports) {
    parsed.imports = [];
    parsed.baseline = captureBaseline(parsed);
  }
  if (parsed.baseline === undefined) parsed.baseline = null;
  // Number existing customers in the order they were first added.
  parsed.customer_aliases = assignAliases(parsed.customer_aliases ?? {}, parsed.clients.map((c) => c.name));
  return parsed;
}

/**
 * Moves data written under a pre-rename key onto the current key.
 * Returns the raw payload that was migrated, or `null` if there was nothing to migrate.
 */
function migrateLegacyData(): string | null {
  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    const raw = localStorage.getItem(legacyKey);
    if (raw === null) continue;

    localStorage.setItem(STORAGE_KEY, raw);
    localStorage.removeItem(legacyKey);
    return raw;
  }
  return null;
}

export function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY) ?? migrateLegacyData();
  if (raw === null) {
    saveData(EMPTY_DATA);
    return EMPTY_DATA;
  }
  try {
    return parseData(raw);
  } catch {
    throw new Error("Corrupted app data in localStorage");
  }
}

export class StorageFullError extends Error {
  constructor() {
    super("Browser storage is full. Remove older imported files, then try again.");
    this.name = "StorageFullError";
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") throw new StorageFullError();
    throw e;
  }
}

export function resetData(): AppData {
  localStorage.removeItem(STORAGE_KEY);
  for (const legacyKey of LEGACY_STORAGE_KEYS) localStorage.removeItem(legacyKey);
  return loadData();
}
