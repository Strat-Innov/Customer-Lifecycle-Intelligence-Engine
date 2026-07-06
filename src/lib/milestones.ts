import { REQUIRED_DOCS } from "@/types";
import type { Client, DocumentationStatus, Milestone, MilestoneName } from "@/types";

export const MILESTONES: Milestone[] = [
  { name: "10% Payment", rule: "payment_percentage first reaches >= 10%" },
  { name: "CREQ", rule: "all required documents are submitted" },
];

export function buildDocStatus(submitted: string[]): DocumentationStatus {
  const submittedClean = submitted.map((s) => s.trim()).filter(Boolean);
  const required = [...REQUIRED_DOCS];
  const missing = required.filter((doc) => !submittedClean.includes(doc));
  return { required, submitted: submittedClean, missing };
}

export function isCreqComplete(docs: DocumentationStatus): boolean {
  return docs.missing.length === 0;
}

/**
 * Compares a client's state before and after an update, returning the list of
 * milestone names newly crossed (not previously in milestones_reached).
 */
export function detectNewMilestones(
  priorMilestones: string[],
  newPaymentPercentage: number,
  newDocs: DocumentationStatus
): MilestoneName[] {
  const newlyCrossed: MilestoneName[] = [];

  if (newPaymentPercentage >= 10 && !priorMilestones.includes("10% Payment")) {
    newlyCrossed.push("10% Payment");
  }
  if (isCreqComplete(newDocs) && !priorMilestones.includes("CREQ")) {
    newlyCrossed.push("CREQ");
  }
  return newlyCrossed;
}

export function clientMilestoneBadges(client: Client): MilestoneName[] {
  return client.milestones_reached as MilestoneName[];
}
