export const REQUIRED_DOCS = [
  "Valid ID",
  "Proof of Income",
  "Tax Returns",
  "Bank Statements",
  "Reservation Agreement",
  "Contract to Sell",
  "Title Documents",
  "Transfer Certificate",
] as const;

export type RequiredDoc = (typeof REQUIRED_DOCS)[number];

export interface DocumentationStatus {
  required: string[];
  submitted: string[];
  missing: string[];
}

export interface Client {
  id: string;
  name: string;
  contract_value: number;
  payment_to_date: number;
  payment_percentage: number;
  documentation_status: DocumentationStatus;
  milestones_reached: string[];
  created_at: string;
}

export interface PaymentHistory {
  client_id: string;
  date: string;
  payment_percentage: number;
}

export type MilestoneName = "10% Payment" | "CREQ";

export interface Milestone {
  name: MilestoneName;
  rule: string;
}

export type ForecastFlagType = "approaching_10" | "near_creq" | "inactive";

export interface ForecastFlag {
  client_id: string;
  type: ForecastFlagType;
  generated_date: string;
}

export interface Notification {
  id: string;
  client_id: string;
  client_name: string;
  milestone: MilestoneName;
  payment_percentage: number;
  timestamp: string;
  email_sent: boolean;
}

export interface WeeklyReport {
  week_start: string;
  week_end: string;
  milestones: Notification[];
}

export interface AppSettings {
  alert_email: string;
}

export interface AppData {
  clients: Client[];
  payment_history: PaymentHistory[];
  notifications: Notification[];
  settings: AppSettings;
}
