import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppData, Notification } from "@/types";
import { loadData, saveData } from "@/lib/storage";
import { parseSalesReport, processSalesReportRows } from "@/lib/salesReport";
import { buildDocStatus, detectNewMilestones } from "@/lib/milestones";
import { generateProjectionAlerts } from "@/lib/forecast";
import { sendMilestoneAlerts } from "@/lib/email";

interface AppDataContextValue {
  data: AppData;
  uploadCsv: (text: string) => { customersProcessed: number; newNotifications: Notification[] };
  setAlertEmail: (email: string) => void;
  updateClientDocuments: (clientId: string, submittedDocs: string[]) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  function uploadCsv(text: string) {
    const rows = parseSalesReport(text);
    const result = processSalesReportRows(rows, data);

    const projection = generateProjectionAlerts(result.data);
    const combinedData: AppData = {
      ...result.data,
      clients: projection.clients,
      notifications: [...projection.newNotifications, ...result.data.notifications],
    };
    setData(combinedData);

    const allNewNotifications = [...result.newNotifications, ...projection.newNotifications];
    if (allNewNotifications.length > 0) {
      sendMilestoneAlerts(allNewNotifications).then((sent) => {
        setData((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => sent.find((s) => s.id === n.id) ?? n),
        }));
      });
    }

    return { customersProcessed: result.customersProcessed, newNotifications: allNewNotifications };
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
    <AppDataContext.Provider value={{ data, uploadCsv, setAlertEmail, updateClientDocuments }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
