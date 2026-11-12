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
  /** The import that generated this notification; absent for manual (documentation) triggers. */
  import_id?: string;
}

export interface WeeklyReport {
  week_start: string;
  week_end: string;
  milestones: Notification[];
}

export interface AppSettings {
  alert_email: string;
  /** When true, customer names are shown as "Customer N" everywhere in the app. */
  hide_customer_names: boolean;
}

/** One parsed Sales Report row, as stored on an import so it can be replayed. */
export interface SalesReportRow {
  name: string;
  contract_number: string;
  project_code: string;
  project_name: string;
  credit_date: string;
  contract_value: number;
  payment_percentage: number;
}

/** A Sales Report file that was imported. Its rows are kept so the import can be removed later. */
export interface ImportRecord {
  id: string;
  file_name: string;
  imported_at: string;
  row_count: number;
  customers_processed: number;
  rows: SalesReportRow[];
}

/**
 * Payment data that existed before import tracking was introduced. It has no
 * source file, so it cannot be removed; imports are replayed on top of it.
 */
export interface ImportBaseline {
  captured_at: string;
  clients: Client[];
  payment_history: PaymentHistory[];
  contract_payment_history: ContractPaymentHistory[];
}

export interface AppData {
  clients: Client[];
  payment_history: PaymentHistory[];
  contract_payment_history: ContractPaymentHistory[];
  notifications: Notification[];
  settings: AppSettings;
  /** Imported files, oldest first. */
  imports: ImportRecord[];
  baseline: ImportBaseline | null;
  /** Permanent display number per customer, keyed by lowercased name. See lib/customerAliases. */
  customer_aliases: Record<string, number>;
}
