import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppData, Notification } from "@/types";
import { loadData, saveData } from "@/lib/storage";
import { parseCsv, processCsvRows } from "@/lib/csv";
import { sendMilestoneAlerts } from "@/lib/email";

interface AppDataContextValue {
  data: AppData;
  uploadCsv: (text: string) => { rowsProcessed: number; newNotifications: Notification[] };
  setAlertEmail: (email: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  function uploadCsv(text: string) {
    const rows = parseCsv(text);
    const result = processCsvRows(rows, data);
    setData(result.data);

    if (result.newNotifications.length > 0) {
      sendMilestoneAlerts(result.newNotifications).then((sent) => {
        setData((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => sent.find((s) => s.id === n.id) ?? n),
        }));
      });
    }

    return { rowsProcessed: result.rowsProcessed, newNotifications: result.newNotifications };
  }

  function setAlertEmail(email: string) {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, alert_email: email } }));
  }

  return (
    <AppDataContext.Provider value={{ data, uploadCsv, setAlertEmail }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
