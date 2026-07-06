import type { AppData, Client, Notification, PaymentHistory } from "@/types";
import { buildDocStatus, detectNewMilestones } from "@/lib/milestones";

interface SeedInput {
  name: string;
  contract_value: number;
  payment_history_pct: number[]; // sequence of payment percentages over time, most recent last
  documents_submitted: string[];
  daysAgoForHistory: number[]; // matching days-ago for each history point
}

const SEED_INPUTS: SeedInput[] = [
  {
    name: "Maria Santos",
    contract_value: 5_000_000,
    payment_history_pct: [4.5, 7.2, 9.5],
    daysAgoForHistory: [60, 30, 3],
    documents_submitted: ["Valid ID", "Proof of Income", "Tax Returns"],
  },
  {
    name: "Juan Dela Cruz",
    contract_value: 3_200_000,
    payment_history_pct: [3, 6.5, 11.8],
    daysAgoForHistory: [75, 40, 5],
    documents_submitted: [
      "Valid ID",
      "Proof of Income",
      "Tax Returns",
      "Bank Statements",
      "Reservation Agreement",
      "Contract to Sell",
      "Title Documents",
    ],
  },
  {
    name: "Ana Reyes",
    contract_value: 7_800_000,
    payment_history_pct: [12, 18, 25.4],
    daysAgoForHistory: [90, 45, 10],
    documents_submitted: [
      "Valid ID",
      "Proof of Income",
      "Tax Returns",
      "Bank Statements",
      "Reservation Agreement",
      "Contract to Sell",
      "Title Documents",
      "Transfer Certificate",
    ],
  },
  {
    name: "Carlo Ramirez",
    contract_value: 4_500_000,
    payment_history_pct: [2.1, 2.1, 2.1],
    daysAgoForHistory: [70, 45, 32],
    documents_submitted: ["Valid ID"],
  },
  {
    name: "Bea Fernandez",
    contract_value: 6_100_000,
    payment_history_pct: [15, 22, 33.9],
    daysAgoForHistory: [80, 35, 8],
    documents_submitted: [
      "Valid ID",
      "Proof of Income",
      "Tax Returns",
      "Bank Statements",
      "Reservation Agreement",
      "Contract to Sell",
    ],
  },
  {
    name: "Ricardo Torres",
    contract_value: 2_900_000,
    payment_history_pct: [1.2, 3.4, 5.9],
    daysAgoForHistory: [50, 25, 2],
    documents_submitted: ["Valid ID", "Proof of Income"],
  },
];

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function buildSeedData(): AppData {
  const clients: Client[] = [];
  const payment_history: PaymentHistory[] = [];
  const notifications: Notification[] = [];

  for (const seed of SEED_INPUTS) {
    const id = crypto.randomUUID();
    const finalPct = seed.payment_history_pct[seed.payment_history_pct.length - 1];
    const documentation_status = buildDocStatus(seed.documents_submitted);

    let milestones_reached: string[] = [];
    seed.payment_history_pct.forEach((pct, idx) => {
      const date = daysAgoIso(seed.daysAgoForHistory[idx]);
      payment_history.push({ client_id: id, date, payment_percentage: pct });

      const newlyCrossed = detectNewMilestones(milestones_reached, pct, documentation_status);
      for (const m of newlyCrossed) {
        notifications.push({
          id: crypto.randomUUID(),
          client_id: id,
          client_name: seed.name,
          milestone: m,
          payment_percentage: pct,
          timestamp: date,
          email_sent: true,
          sent_to: "joseph.bagadiong@filinvestcity.com",
        });
      }
      milestones_reached = [...new Set([...milestones_reached, ...newlyCrossed])];
    });

    clients.push({
      id,
      name: seed.name,
      contract_value: seed.contract_value,
      payment_to_date: (finalPct / 100) * seed.contract_value,
      payment_percentage: finalPct,
      documentation_status,
      milestones_reached,
      created_at: daysAgoIso(Math.max(...seed.daysAgoForHistory)),
    });
  }

  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    clients,
    payment_history,
    notifications,
    settings: { alert_email: "joseph.bagadiong@filinvestcity.com" },
  };
}
