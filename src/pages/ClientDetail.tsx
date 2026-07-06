import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useAppData } from "@/context/AppDataContext";
import { formatCurrency, formatPercent, formatDate, formatDateTime } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { data } = useAppData();
  const client = data.clients.find((c) => c.id === id);

  if (!client) return <Navigate to="/clients" replace />;

  const history = data.payment_history
    .filter((h) => h.client_id === client.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((h) => ({ date: formatDate(h.date), pct: Number(h.payment_percentage.toFixed(2)) }));

  const milestoneHistory = data.notifications
    .filter((n) => n.client_id === client.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to Clients
      </Link>

      <div className="glass-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Client since {formatDate(client.created_at)}
            </p>
          </div>
          <div className="flex gap-1.5">
            {client.milestones_reached.includes("10% Payment") && (
              <span className="milestone-badge-10">10% Payment reached</span>
            )}
            {client.milestones_reached.includes("CREQ") && (
              <span className="milestone-badge-creq">CREQ complete</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <Metric label="Contract Value" value={formatCurrency(client.contract_value)} />
          <Metric label="Paid to Date" value={formatCurrency(client.payment_to_date)} />
          <Metric label="Payment %" value={formatPercent(client.payment_percentage)} />
          <Metric
            label="Docs Submitted"
            value={`${client.documentation_status.submitted.length}/${client.documentation_status.required.length}`}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No payment history recorded yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ReferenceLine y={10} stroke="hsl(var(--warning))" strokeDasharray="4 4" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v}%`, "Payment"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Documentation Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.documentation_status.required.map((doc) => {
              const submitted = client.documentation_status.submitted.includes(doc);
              return (
                <div key={doc} className="flex items-center gap-2.5 text-sm py-1">
                  {submitted ? (
                    <CheckCircle2 size={16} className="text-success shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-muted-foreground shrink-0" />
                  )}
                  <span className={submitted ? "text-foreground" : "text-muted-foreground"}>{doc}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestone History</CardTitle>
          </CardHeader>
          <CardContent>
            {milestoneHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No milestones triggered yet.</p>
            ) : (
              <div className="space-y-3">
                {milestoneHistory.map((n) => (
                  <div key={n.id} className="flex items-center justify-between text-sm border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <span className={n.milestone === "10% Payment" ? "milestone-badge-10" : "milestone-badge-creq"}>
                      {n.milestone}
                    </span>
                    <span className="text-muted-foreground text-xs">{formatDateTime(n.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="font-mono text-lg font-bold">{value}</p>
    </div>
  );
}
