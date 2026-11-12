import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { formatCurrency, formatPercent, formatDate, formatDateTime, milestoneBadgeClass } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PaymentTimelineChart } from "@/components/PaymentTimelineChart";

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, updateClientDocuments, displayName } = useAppData();
  const client = data.clients.find((c) => c.id === id);

  if (!client) return <Navigate to="/clients" replace />;

  const history = data.payment_history
    .filter((h) => h.client_id === client.id)
    .map((h) => ({ date: h.date, pct: h.payment_percentage }));

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
            <h1 className="text-2xl font-bold tracking-tight">{displayName(client.name)}</h1>
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
          <CardDescription>Combined across all contracts</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentTimelineChart points={history} height={288} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contracts ({client.contracts.length})</CardTitle>
          <CardDescription>
            One row per contract on file. Payment % is per-contract, combined into the overview above.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contract Number</th>
                  <th>Project</th>
                  <th>Credited</th>
                  <th>Contract Value</th>
                  <th>Payment %</th>
                </tr>
              </thead>
              <tbody>
                {client.contracts.map((c) => (
                  <tr key={c.contract_number}>
                    <td className="font-mono text-xs">{c.contract_number}</td>
                    <td>{c.project_name || c.project_code}</td>
                    <td className="text-muted-foreground">{formatDate(c.credit_date)}</td>
                    <td className="font-mono">{formatCurrency(c.contract_value)}</td>
                    <td className="font-mono">{formatPercent(c.payment_percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {client.contracts.map((contract) => {
        const contractHistory = data.contract_payment_history
          .filter((h) => h.contract_number === contract.contract_number)
          .map((h) => ({ date: h.date, pct: h.payment_percentage }));

        return (
          <Card key={contract.contract_number}>
            <CardHeader>
              <CardTitle>{contract.project_name || contract.project_code}</CardTitle>
              <CardDescription>
                Contract {contract.contract_number} · Credited {formatDate(contract.credit_date)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentTimelineChart points={contractHistory} height={224} />
            </CardContent>
          </Card>
        );
      })}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Documentation Checklist</CardTitle>
            <CardDescription>Click a document to mark it submitted or missing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.documentation_status.required.map((doc) => {
              const submitted = client.documentation_status.submitted.includes(doc);
              return (
                <button
                  key={doc}
                  onClick={() => {
                    const next = submitted
                      ? client.documentation_status.submitted.filter((d) => d !== doc)
                      : [...client.documentation_status.submitted, doc];
                    updateClientDocuments(client.id, next);
                  }}
                  className="flex items-center gap-2.5 text-sm py-1 w-full text-left hover:bg-accent rounded-md px-1 -mx-1 transition-colors"
                >
                  {submitted ? (
                    <CheckCircle2 size={16} className="text-success shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-muted-foreground shrink-0" />
                  )}
                  <span className={submitted ? "text-foreground" : "text-muted-foreground"}>{doc}</span>
                </button>
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
                    <span className={milestoneBadgeClass(n.milestone)}>
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
