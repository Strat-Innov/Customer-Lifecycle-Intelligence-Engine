import type { Contract } from "@/types";

export function aggregateContracts(contracts: Contract[]): {
  contract_value: number;
  payment_to_date: number;
  payment_percentage: number;
} {
  const contract_value = contracts.reduce((sum, c) => sum + c.contract_value, 0);
  const payment_to_date = contracts.reduce((sum, c) => sum + c.payment_to_date, 0);
  const payment_percentage = contract_value > 0 ? (payment_to_date / contract_value) * 100 : 0;
  return { contract_value, payment_to_date, payment_percentage };
}

const CREDIT_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4}) 12:00:00 am$/i;

export function parseCreditDate(raw: string): string {
  const match = CREDIT_DATE_PATTERN.exec(raw.trim());
  if (!match) {
    throw new Error(`Credit Date "${raw}" did not match the expected MM/DD/YYYY 12:00:00 am format`);
  }
  const [, month, day, year] = match;
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
}
