import { useMemo } from "react";
import { Download } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { formatDate, formatPercent, isoWeekRange, milestoneBadgeClass } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { WeeklyReport } from "@/types";

export function Reports() {
  const { data } = useAppData();

  const weeklyReports: WeeklyReport[] = useMemo(() => {
    const byWeek = new Map<string, WeeklyReport>();
    for (const n of data.notifications) {
      const { start, end } = isoWeekRange(n.timestamp);
      const key = start;
      if (!byWeek.has(key)) {
        byWeek.set(key, { week_start: start, week_end: end, milestones: [] });
      }
      byWeek.get(key)!.milestones.push(n);
    }
    return [...byWeek.values()].sort(
      (a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
    );
  }, [data.notifications]);

  function exportReport(report: WeeklyReport) {
    const header = "client_name,milestone,payment_percentage,timestamp,email_sent";
    const rows = report.milestones.map(
      (n) => `${n.client_name},${n.milestone},${n.payment_percentage.toFixed(2)},${n.timestamp},${n.email_sent}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-report-${formatDate(report.week_start).replace(/\s|,/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Weekly Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Milestones grouped by ISO week, ready to export and share.
        </p>
      </div>

      {weeklyReports.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No milestone activity recorded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {weeklyReports.map((report) => (
            <Card key={report.week_start}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>
                    Week of {formatDate(report.week_start)} – {formatDate(report.week_end)}
                  </CardTitle>
                  <CardDescription>{report.milestones.length} milestone(s) triggered</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => exportReport(report)}>
                  <Download size={14} /> Export CSV
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Milestone</th>
                        <th>Payment %</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.milestones.map((n) => (
                        <tr key={n.id}>
                          <td>{n.client_name}</td>
                          <td>
                            <span className={milestoneBadgeClass(n.milestone)}>
                              {n.milestone}
                            </span>
                          </td>
                          <td className="font-mono">{formatPercent(n.payment_percentage)}</td>
                          <td className="text-muted-foreground">{formatDate(n.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
