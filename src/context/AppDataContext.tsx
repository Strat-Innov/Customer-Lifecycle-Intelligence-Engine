import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AppData, Notification } from "@/types";
import { loadData, saveData } from "@/lib/storage";
import { parseSalesReport } from "@/lib/salesReport";
import { applyImport, removeImport as removeImportFromData } from "@/lib/imports";
import { buildDocStatus, detectNewMilestones } from "@/lib/milestones";
import { sendMilestoneAlerts } from "@/lib/email";

export interface ImportFileResult {
  fileName: string;
  customersProcessed: number;
  newNotifications: Notification[];
}

interface AppDataContextValue {
  data: AppData;
  /** Parses and applies a Sales Report, recording it as an import. Throws on invalid files or full storage. */
  importFile: (fileName: string, text: string) => ImportFileResult;
  /** Removes an import and rebuilds payment data without it. */
  removeImport: (importId: string) => void;
  setAlertEmail: (email: string) => void;
  updateClientDocuments: (clientId: string, submittedDocs: string[]) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());
  // Latest data, updated synchronously by importFile so several files imported
  // back-to-back each build on the previous one rather than a stale render.
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    saveData(data);
  }, [data]);

  function importFile(fileName: string, text: string): ImportFileResult {
    const rows = parseSalesReport(text);
    const result = applyImport(dataRef.current, { fileName, rows });

    // Save up front so a full browser storage is reported as an import error
    // instead of failing silently in the persistence effect.
    saveData(result.data);
    dataRef.current = result.data;
    setData(result.data);

    if (result.newNotifications.length > 0) {
      sendMilestoneAlerts(result.newNotifications).then((sent) => {
        setData((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => sent.find((s) => s.id === n.id) ?? n),
        }));
      });
    }

    return { fileName, customersProcessed: result.customersProcessed, newNotifications: result.newNotifications };
  }

  function removeImport(importId: string) {
    setData((prev) => removeImportFromData(prev, importId));
  }

  function setAlertEmail(email: string) {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, alert_email: email } }));
  }

  function updateClientDocuments(clientId: string, submittedDocs: string[]) {
    const client = data.clients.find((c) => c.id === clientId);
    if (!client) throw new Error(`Client ${clientId} not found`);

    const documentation_status = buildDocStatus(submittedDocs);
    const today = new Date().toISOString();
    const newlyCrossed = detectNewMilestones(client.milestones_reached, client.payment_percentage, documentation_status);

    const updatedClients = data.clients.map((c) =>
      c.id === clientId
        ? { ...c, documentation_status, milestones_reached: [...new Set([...c.milestones_reached, ...newlyCrossed])] }
        : c
    );

    const newNotifications: Notification[] = newlyCrossed.map((milestone) => ({
      id: crypto.randomUUID(),
      client_id: client.id,
      client_name: client.name,
      milestone,
      payment_percentage: client.payment_percentage,
      timestamp: today,
      email_sent: false,
      sent_to: data.settings.alert_email,
      kind: "milestone" as const,
    }));

    setData((prev) => ({
      ...prev,
      clients: updatedClients,
      notifications: [...newNotifications, ...prev.notifications],
    }));

    if (newNotifications.length > 0) {
      sendMilestoneAlerts(newNotifications).then((sent) => {
        setData((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => sent.find((s) => s.id === n.id) ?? n),
        }));
      });
    }
  }

  return (
    <AppDataContext.Provider value={{ data, importFile, removeImport, setAlertEmail, updateClientDocuments }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
