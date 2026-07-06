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

export interface Contract {
  contract_number: string;
  project_code: string;
  project_name: string;
  credit_date: string;
  contract_value: number;
  payment_percentage: number;
  payment_to_date: number;
}

export interface ContractPaymentHistory {
  contract_number: string;
  date: string;
  payment_percentage: number;
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
  contracts: Contract[];
  projected_10_alert_sent: boolean;
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

export type ForecastFlagType = "approaching_10" | "near_creq" | "inactive" | "projected_10_next_30";

export interface ForecastFlag {
  client_id: string;
  type: ForecastFlagType;
  generated_date: string;
}

export type NotificationKind = "milestone" | "forecast";

export interface Notification {
  id: string;
  client_id: string;
  client_name: string;
  milestone: MilestoneName | "Projected 10% (Next 30 Days)";
  payment_percentage: number;
  timestamp: string;
  email_sent: boolean;
  sent_to: string;
  kind: NotificationKind;
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
  contract_payment_history: ContractPaymentHistory[];
  notifications: Notification[];
  settings: AppSettings;
}
