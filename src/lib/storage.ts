import type { AppData } from "@/types";
import { buildSeedData } from "@/lib/seed";

const STORAGE_KEY = "filinvest_milestone_tracker_data_v1";

export function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = buildSeedData();
    saveData(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.settings) parsed.settings = { alert_email: "joseph.bagadiong@filinvestcity.com" };
    return parsed;
  } catch {
    throw new Error("Corrupted app data in localStorage");
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData(): AppData {
  localStorage.removeItem(STORAGE_KEY);
  return loadData();
}
