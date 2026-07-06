import type { AppData, Contract, Notification } from "@/types";
import { buildDocStatus, detectNewMilestones } from "@/lib/milestones";
import { aggregateContracts, parseCreditDate } from "@/lib/contracts";

export interface SalesReportRow {
  name: string;
  contract_number: string;
  project_code: string;
  project_name: string;
  credit_date: string;
  contract_value: number;
  payment_percentage: number;
}

const REQUIRED_HEADERS = [
  "Customer Name",
  "Contract Number",
  "Project",
  "Project(Desc)",
  "Credit Date",
  "TCP",
  "Payment Percentage",
] as const;

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
    const contract_number = cols[colIndex["Contract Number"]]?.trim();
    const project_code = cols[colIndex["Project"]]?.trim();
    const project_name = cols[colIndex["Project(Desc)"]]?.trim();
    const credit_date_raw = cols[colIndex["Credit Date"]]?.trim();
    const contract_value = Number(cols[colIndex["TCP"]]);
    const payment_percentage = Number(cols[colIndex["Payment Percentage"]]);

    if (
      !rawName ||
      !contract_number ||
      !credit_date_raw ||
      Number.isNaN(contract_value) ||
      Number.isNaN(payment_percentage)
    ) {
      throw new Error(
        `Row ${i + 2} is malformed: expected values for Customer Name, Contract Number, Credit Date, TCP, Payment Percentage`
      );
    }

    return {
      name: rawName,
      contract_number,
      project_code: project_code ?? "",
      project_name: project_name ?? "",
      credit_date: parseCreditDate(credit_date_raw),
      contract_value,
      payment_percentage,
    };
  });
}

export interface SalesReportProcessResult {
  data: AppData;
  customersProcessed: number;
  newNotifications: Notification[];
}

export function processSalesReportRows(rows: SalesReportRow[], data: AppData): SalesReportProcessResult {
  const today = new Date().toISOString();
  const alertEmail = data.settings.alert_email;
  const newNotifications: Notification[] = [];
  const clients = [...data.clients];
  const paymentHistory = [...data.payment_history];
  const contractPaymentHistory = [...data.contract_payment_history];

  // A customer can appear on multiple rows (one per contract). Group rows by
  // customer name so each customer is matched/updated exactly once per upload.
  const rowsByCustomer = new Map<string, SalesReportRow[]>();
  for (const row of rows) {
    const key = row.name.toLowerCase();
    const existing = rowsByCustomer.get(key);
    if (existing) existing.push(row);
    else rowsByCustomer.set(key, [row]);
  }

  for (const [, customerRows] of rowsByCustomer) {
    const name = customerRows[0].name;
    let client = clients.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const priorMilestones = client ? client.milestones_reached : [];
    const existingContracts: Contract[] = client ? [...client.contracts] : [];

    for (const row of customerRows) {
      const payment_to_date = (row.payment_percentage / 100) * row.contract_value;
      const contractIndex = existingContracts.findIndex((c) => c.contract_number === row.contract_number);

      if (contractIndex === -1) {
        existingContracts.push({
          contract_number: row.contract_number,
          project_code: row.project_code,
          project_name: row.project_name,
          credit_date: row.credit_date,
          contract_value: row.contract_value,
          payment_percentage: row.payment_percentage,
          payment_to_date,
        });
        // A contract's timeline starts at its own credit date, not the upload date.
        contractPaymentHistory.push({
          contract_number: row.contract_number,
          date: row.credit_date,
          payment_percentage: row.payment_percentage,
        });
      } else {
        existingContracts[contractIndex] = {
          ...existingContracts[contractIndex],
          contract_value: row.contract_value,
          payment_percentage: row.payment_percentage,
          payment_to_date,
        };
        // Subsequent updates to an existing contract are dated by the real upload day.
        contractPaymentHistory.push({
          contract_number: row.contract_number,
          date: today,
          payment_percentage: row.payment_percentage,
        });
      }
    }

    const aggregate = aggregateContracts(existingContracts);
    const documentation_status = client ? client.documentation_status : buildDocStatus([]);
    const newlyCrossed = detectNewMilestones(priorMilestones, aggregate.payment_percentage, documentation_status);

    if (client) {
      client.contract_value = aggregate.contract_value;
      client.payment_to_date = aggregate.payment_to_date;
      client.payment_percentage = aggregate.payment_percentage;
      client.contracts = existingContracts;
      client.milestones_reached = [...new Set([...priorMilestones, ...newlyCrossed])];
    } else {
      client = {
        id: crypto.randomUUID(),
        name,
        contract_value: aggregate.contract_value,
        payment_to_date: aggregate.payment_to_date,
        payment_percentage: aggregate.payment_percentage,
        documentation_status,
        milestones_reached: [...newlyCrossed],
        created_at: today,
        contracts: existingContracts,
        projected_10_alert_sent: false,
      };
      clients.push(client);
    }

    paymentHistory.push({ client_id: client.id, date: today, payment_percentage: aggregate.payment_percentage });

    for (const milestone of newlyCrossed) {
      newNotifications.push({
        id: crypto.randomUUID(),
        client_id: client.id,
        client_name: client.name,
        milestone,
        payment_percentage: aggregate.payment_percentage,
        timestamp: today,
        email_sent: false,
        sent_to: alertEmail,
        kind: "milestone",
      });
    }
  }

  const updated: AppData = {
    ...data,
    clients,
    payment_history: paymentHistory,
    contract_payment_history: contractPaymentHistory,
    notifications: [...newNotifications, ...data.notifications],
  };

  return { data: updated, customersProcessed: rowsByCustomer.size, newNotifications };
}
