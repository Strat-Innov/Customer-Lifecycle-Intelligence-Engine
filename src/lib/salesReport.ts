import type { AppData, Notification } from "@/types";
import { buildDocStatus, detectNewMilestones } from "@/lib/milestones";

export interface SalesReportRow {
  name: string;
  contract_value: number;
  payment_percentage: number;
}

const REQUIRED_HEADERS = ["Customer Name", "TCP", "Payment Percentage"] as const;

function detectDelimiter(headerLine: string): "\t" | "," {
  return headerLine.includes("\t") ? "\t" : ",";
}

export function parseSalesReport(text: string): SalesReportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("Sales report must contain a header row and at least one data row");
  }

  const delimiter = detectDelimiter(lines[0]);
  const header = lines[0].split(delimiter).map((h) => h.trim());

  const colIndex: Record<string, number> = {};
  for (const required of REQUIRED_HEADERS) {
    const idx = header.indexOf(required);
    if (idx === -1) {
      throw new Error(`Sales report is missing required column: ${required}`);
    }
    colIndex[required] = idx;
  }

  return lines.slice(1).map((line, i) => {
    const cols = line.split(delimiter);
    const rawName = cols[colIndex["Customer Name"]]?.trim();
    const contract_value = Number(cols[colIndex["TCP"]]);
    const payment_percentage = Number(cols[colIndex["Payment Percentage"]]);

    if (!rawName || Number.isNaN(contract_value) || Number.isNaN(payment_percentage)) {
      throw new Error(`Row ${i + 2} is malformed: expected values for Customer Name, TCP, Payment Percentage`);
    }

    return { name: rawName, contract_value, payment_percentage };
  });
}

export interface SalesReportProcessResult {
  data: AppData;
  customersProcessed: number;
  newNotifications: Notification[];
}

/**
 * A customer can appear on multiple rows if they hold more than one contract.
 * This app tracks one entry per customer, so contracts are combined here:
 * contract value sums, and payment_percentage is recomputed from the summed
 * totals (paid / contract_value) rather than averaged, since averaging
 * percentages across differently-sized contracts would misrepresent progress.
 */
function aggregateByCustomer(rows: SalesReportRow[]): SalesReportRow[] {
  const totals = new Map<string, { name: string; contract_value: number; paid: number }>();

  for (const row of rows) {
    const key = row.name.toLowerCase();
    const paid = (row.payment_percentage / 100) * row.contract_value;
    const existing = totals.get(key);
    if (existing) {
      existing.contract_value += row.contract_value;
      existing.paid += paid;
    } else {
      totals.set(key, { name: row.name, contract_value: row.contract_value, paid });
    }
  }

  return [...totals.values()].map((t) => ({
    name: t.name,
    contract_value: t.contract_value,
    payment_percentage: t.contract_value > 0 ? (t.paid / t.contract_value) * 100 : 0,
  }));
}

export function processSalesReportRows(rawRows: SalesReportRow[], data: AppData): SalesReportProcessResult {
  const rows = aggregateByCustomer(rawRows);
  const today = new Date().toISOString();
  const alertEmail = data.settings.alert_email;
  const newNotifications: Notification[] = [];
  const clients = [...data.clients];
  const paymentHistory = [...data.payment_history];

  for (const row of rows) {
    const payment_percentage = row.payment_percentage;
    const payment_to_date = (payment_percentage / 100) * row.contract_value;

    let client = clients.find((c) => c.name.toLowerCase() === row.name.toLowerCase());
    const priorMilestones = client ? client.milestones_reached : [];
    const documentation_status = client ? client.documentation_status : buildDocStatus([]);

    const newlyCrossed = detectNewMilestones(priorMilestones, payment_percentage, documentation_status);

    if (client) {
      client.contract_value = row.contract_value;
      client.payment_to_date = payment_to_date;
      client.payment_percentage = payment_percentage;
      client.milestones_reached = [...new Set([...priorMilestones, ...newlyCrossed])];
    } else {
      client = {
        id: crypto.randomUUID(),
        name: row.name,
        contract_value: row.contract_value,
        payment_to_date,
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

  return { data: updated, customersProcessed: rows.length, newNotifications };
}
