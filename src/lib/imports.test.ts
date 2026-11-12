import { describe, expect, it } from "vitest";
import type { AppData, SalesReportRow } from "@/types";
import { applyImport, captureBaseline, removeImport } from "@/lib/imports";
import { buildDocStatus } from "@/lib/milestones";
import { REQUIRED_DOCS } from "@/types";

function emptyData(): AppData {
  return {
    clients: [],
    payment_history: [],
    contract_payment_history: [],
    notifications: [],
    settings: { alert_email: "alerts@example.com" },
    imports: [],
    baseline: null,
  };
}

function row(name: string, contract: string, pct: number, tcp = 1_000_000): SalesReportRow {
  return {
    name,
    contract_number: contract,
    project_code: "P1",
    project_name: "Project One",
    credit_date: "2026-01-01T00:00:00.000Z",
    contract_value: tcp,
    payment_percentage: pct,
  };
}

const DAY1 = "2026-11-01T00:00:00.000Z";
const DAY2 = "2026-11-02T00:00:00.000Z";
const DAY3 = "2026-11-03T00:00:00.000Z";

function importAll(files: { name: string; rows: SalesReportRow[]; at: string }[], start = emptyData()) {
  return files.reduce((data, f) => applyImport(data, { fileName: f.name, rows: f.rows, importedAt: f.at }).data, start);
}

describe("applyImport", () => {
  it("records the file with its rows and counts", () => {
    const result = applyImport(emptyData(), {
      fileName: "report.xls",
      rows: [row("DELA CRUZ, JUAN", "C1", 5), row("DELA CRUZ, JUAN", "C2", 7), row("SANTOS, MARIA", "C3", 3)],
      importedAt: DAY1,
    });

    expect(result.data.imports).toHaveLength(1);
    expect(result.record).toMatchObject({ file_name: "report.xls", imported_at: DAY1, row_count: 3, customers_processed: 2 });
    expect(result.data.clients).toHaveLength(2);
  });

  it("tags notifications with the import that triggered them", () => {
    const result = applyImport(emptyData(), { fileName: "a.xls", rows: [row("DELA CRUZ, JUAN", "C1", 12)], importedAt: DAY1 });
    expect(result.newNotifications).toHaveLength(1);
    expect(result.newNotifications[0].import_id).toBe(result.record.id);
  });

  it("does not mutate the input data", () => {
    const first = importAll([{ name: "a.xls", rows: [row("DELA CRUZ, JUAN", "C1", 5)], at: DAY1 }]);
    const snapshot = JSON.stringify(first);
    applyImport(first, { fileName: "b.xls", rows: [row("DELA CRUZ, JUAN", "C1", 9)], importedAt: DAY2 });
    expect(JSON.stringify(first)).toBe(snapshot);
  });
});

describe("removeImport", () => {
  it("restores the values from the remaining imports", () => {
    const data = importAll([
      { name: "a.xls", rows: [row("DELA CRUZ, JUAN", "C1", 5)], at: DAY1 },
      { name: "b.xls", rows: [row("DELA CRUZ, JUAN", "C1", 8)], at: DAY2 },
    ]);
    const after = removeImport(data, data.imports[1].id);

    expect(after.imports.map((i) => i.file_name)).toEqual(["a.xls"]);
    expect(after.clients[0].payment_percentage).toBeCloseTo(5);
    expect(after.payment_history).toHaveLength(1);
  });

  it("keeps client ids and hand-edited documentation", () => {
    let data = importAll([
      { name: "a.xls", rows: [row("DELA CRUZ, JUAN", "C1", 5)], at: DAY1 },
      { name: "b.xls", rows: [row("DELA CRUZ, JUAN", "C1", 8)], at: DAY2 },
    ]);
    const id = data.clients[0].id;
    data = { ...data, clients: data.clients.map((c) => ({ ...c, documentation_status: buildDocStatus(["Valid ID"]) })) };

    // Removing the file that created the client: it is rebuilt from the later file.
    const after = removeImport(data, data.imports[0].id);
    expect(after.clients).toHaveLength(1);
    expect(after.clients[0].id).toBe(id);
    expect(after.clients[0].documentation_status.submitted).toEqual(["Valid ID"]);
    expect(after.clients[0].created_at).toBe(DAY2);
  });

  it("drops clients and notifications that only came from the removed file", () => {
    const data = importAll([
      { name: "a.xls", rows: [row("DELA CRUZ, JUAN", "C1", 5)], at: DAY1 },
      { name: "b.xls", rows: [row("SANTOS, MARIA", "C2", 15)], at: DAY2 },
    ]);
    expect(data.notifications).toHaveLength(1);

    const after = removeImport(data, data.imports[1].id);
    expect(after.clients.map((c) => c.name)).toEqual(["DELA CRUZ, JUAN"]);
    expect(after.notifications).toHaveLength(0);
  });

  it("undoes a milestone the removed file triggered", () => {
    const data = importAll([
      { name: "a.xls", rows: [row("DELA CRUZ, JUAN", "C1", 5)], at: DAY1 },
      { name: "b.xls", rows: [row("DELA CRUZ, JUAN", "C1", 12)], at: DAY2 },
    ]);
    expect(data.clients[0].milestones_reached).toContain("10% Payment");

    const after = removeImport(data, data.imports[1].id);
    expect(after.clients[0].milestones_reached).not.toContain("10% Payment");
    expect(after.notifications).toHaveLength(0);
  });

  it("re-dates a milestone to the next import that reaches it, without re-emailing", () => {
    const data = importAll([
      { name: "a.xls", rows: [row("DELA CRUZ, JUAN", "C1", 11)], at: DAY1 },
      { name: "b.xls", rows: [row("DELA CRUZ, JUAN", "C1", 12)], at: DAY2 },
    ]);
    const sent = { ...data, notifications: data.notifications.map((n) => ({ ...n, email_sent: true })) };

    const after = removeImport(sent, sent.imports[0].id);
    expect(after.notifications).toHaveLength(1);
    expect(after.notifications[0]).toMatchObject({
      milestone: "10% Payment",
      timestamp: DAY2,
      import_id: sent.imports[1].id,
      email_sent: false,
    });
  });

  it("keeps notifications from documentation edits", () => {
    const data = importAll([
      { name: "a.xls", rows: [row("DELA CRUZ, JUAN", "C1", 5)], at: DAY1 },
      { name: "b.xls", rows: [row("DELA CRUZ, JUAN", "C1", 6)], at: DAY2 },
    ]);
    const client = data.clients[0];
    const withCreq: AppData = {
      ...data,
      clients: [{ ...client, documentation_status: buildDocStatus([...REQUIRED_DOCS]), milestones_reached: ["CREQ"] }],
      notifications: [
        {
          id: "manual",
          client_id: client.id,
          client_name: client.name,
          milestone: "CREQ",
          payment_percentage: 6,
          timestamp: DAY3,
          email_sent: true,
          sent_to: "alerts@example.com",
          kind: "milestone",
        },
      ],
    };

    const after = removeImport(withCreq, withCreq.imports[1].id);
    expect(after.notifications.map((n) => n.id)).toEqual(["manual"]);
    expect(after.clients[0].milestones_reached).toContain("CREQ");
  });

  it("replays on top of the baseline, keeping legacy clients", () => {
    const legacy = importAll([{ name: "old.xls", rows: [row("REYES, ANA", "C9", 4)], at: DAY1 }]);
    const start: AppData = { ...legacy, imports: [], baseline: captureBaseline(legacy) };

    const data = importAll(
      [
        { name: "a.xls", rows: [row("REYES, ANA", "C9", 6)], at: DAY2 },
        { name: "b.xls", rows: [row("DELA CRUZ, JUAN", "C1", 5)], at: DAY3 },
      ],
      start
    );

    const after = removeImport(data, data.imports[0].id);
    const ana = after.clients.find((c) => c.name === "REYES, ANA");
    expect(ana?.payment_percentage).toBeCloseTo(4);
    expect(after.clients.map((c) => c.name)).toContain("DELA CRUZ, JUAN");
    expect(after.baseline).toEqual(data.baseline);
  });

  it("throws for an unknown import", () => {
    expect(() => removeImport(emptyData(), "missing")).toThrow("not found");
  });
});

describe("captureBaseline", () => {
  it("returns null when there is no prior data", () => {
    expect(captureBaseline(emptyData())).toBeNull();
  });
});
