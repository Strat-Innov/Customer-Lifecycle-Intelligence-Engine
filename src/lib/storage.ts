import type { AppData } from "@/types";

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
  settings: { alert_email: DEFAULT_ALERT_EMAIL },
};

function parseData(raw: string): AppData {
  const parsed = JSON.parse(raw) as AppData;
  if (!parsed.settings) parsed.settings = { alert_email: DEFAULT_ALERT_EMAIL };
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

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData(): AppData {
  localStorage.removeItem(STORAGE_KEY);
  for (const legacyKey of LEGACY_STORAGE_KEYS) localStorage.removeItem(legacyKey);
  return loadData();
}
