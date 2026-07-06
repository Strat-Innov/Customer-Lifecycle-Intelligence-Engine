import type { AppData, Notification } from "@/types";
import { buildDocStatus, detectNewMilestones } from "@/lib/milestones";

export interface CsvRow {
  name: string;
  contract_value: number;
  payment_to_date: number;
  documents_submitted: string[];
}

export interface CsvProcessResult {
  data: AppData;
  rowsProcessed: number;
  newNotifications: Notification[];
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must contain a header row and at least one data row");
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const requiredCols = ["name", "contract_value", "payment_to_date", "documents_submitted"];
  for (const col of requiredCols) {
    if (!header.includes(col)) {
      throw new Error(`CSV is missing required column: ${col}`);
    }
  }

  const nameIdx = header.indexOf("name");
  const contractIdx = header.indexOf("contract_value");
  const paymentIdx = header.indexOf("payment_to_date");
  const docsIdx = header.indexOf("documents_submitted");

  return lines.slice(1).map((line, i) => {
    const cols = line.split(",");
    const name = cols[nameIdx]?.trim();
    const contract_value = Number(cols[contractIdx]);
    const payment_to_date = Number(cols[paymentIdx]);
    const documents_submitted = (cols[docsIdx] ?? "")
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean);

    if (!name || Number.isNaN(contract_value) || Number.isNaN(payment_to_date)) {
      throw new Error(`Row ${i + 2} is malformed: expected name, contract_value, payment_to_date, documents_submitted`);
    }

    return { name, contract_value, payment_to_date, documents_submitted };
  });
}

export function processCsvRows(rows: CsvRow[], data: AppData): CsvProcessResult {
  const today = new Date().toISOString();
  const alertEmail = data.settings.alert_email;
  const newNotifications: Notification[] = [];
  const clients = [...data.clients];
  const paymentHistory = [...data.payment_history];

  for (const row of rows) {
    const payment_percentage = row.contract_value > 0 ? (row.payment_to_date / row.contract_value) * 100 : 0;
    const documentation_status = buildDocStatus(row.documents_submitted);

    let client = clients.find((c) => c.name.toLowerCase() === row.name.toLowerCase());
    const priorMilestones = client ? client.milestones_reached : [];

    const newlyCrossed = detectNewMilestones(priorMilestones, payment_percentage, documentation_status);

    if (client) {
      client.contract_value = row.contract_value;
      client.payment_to_date = row.payment_to_date;
      client.payment_percentage = payment_percentage;
      client.documentation_status = documentation_status;
      client.milestones_reached = [...new Set([...priorMilestones, ...newlyCrossed])];
    } else {
      client = {
        id: crypto.randomUUID(),
        name: row.name,
        contract_value: row.contract_value,
        payment_to_date: row.payment_to_date,
        payment_percentage,
        documentation_status,
        milestones_reached: [...newlyCrossed],
        created_at: today,
      };
      clients.push(client);
    }

    paymentHistory.push({ client_id: client.id, date: today, payment_percentage });

    for (const milestone of newlyCrossed) {
      newNotifications.push({
        id: crypto.randomUUID(),
        client_id: client.id,
        client_name: client.name,
        milestone,
        payment_percentage,
        timestamp: today,
        email_sent: false,
        sent_to: alertEmail,
      });
    }
  }

  const updated: AppData = {
    ...data,
    clients,
    payment_history: paymentHistory,
    notifications: [...newNotifications, ...data.notifications],
  };

  return { data: updated, rowsProcessed: rows.length, newNotifications };
}
