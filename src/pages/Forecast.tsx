import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { groupForecastByType, daysUntilTenPercent } from "@/lib/forecast";
import { formatPercent, formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { Client } from "@/types";

export function Forecast() {
  const { data } = useAppData();
  const forecast = groupForecastByType(data);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Forecast</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Clients projected to hit a milestone soon, or who need follow-up.
        </p>
      </div>

      <ForecastSection
        title="Approaching 10%"
        description="Payment between 8% and 9.99% of contract value"
        icon={TrendingUp}
        iconClass="text-warning"
        rowClass="forecast-approaching"
        clients={forecast.approaching10}
        emptyText="No clients currently approaching the 10% milestone."
        renderExtra={(c) => <span className="font-mono text-warning">{formatPercent(c.payment_percentage)}</span>}
      />

      <ForecastSection
        title="Projected 10% Within 30 Days"
        description="Based on the real rate of change between upload snapshots — not a fixed threshold, an actual trend projection"
        icon={TrendingUp}
        iconClass="text-primary"
        rowClass="forecast-approaching"
        clients={forecast.projected10Next30}
        emptyText="No clients are trending toward 10% within the next month."
        renderExtra={(c) => {
          const days = daysUntilTenPercent(c, data);
          return (
            <span className="text-xs text-muted-foreground">
              ~{days !== null ? Math.max(0, Math.round(days)) : "?"} day(s) at current pace
            </span>
          );
        }}
      />

      <ForecastSection
        title="Near CREQ"
        description="Missing only 1–2 required documents"
        icon={CheckCircle2}
        iconClass="text-success"
        rowClass="forecast-near-creq"
        clients={forecast.nearCreq}
        emptyText="No clients are close to completing requirements."
        renderExtra={(c) => (
          <span className="text-xs text-muted-foreground">
            Missing: {c.documentation_status.missing.join(", ")}
          </span>
        )}
      />

      <ForecastSection
        title="Inactive Payments"
        description="No payment increase recorded in the last 30+ days"
        icon={AlertTriangle}
        iconClass="text-destructive"
        rowClass="forecast-inactive"
        clients={forecast.inactive}
        emptyText="No inactive clients detected."
        renderExtra={(c) => <span className="font-mono">{formatCurrency(c.payment_to_date)} paid</span>}
      />
    </div>
  );
}

function ForecastSection({
  title,
  description,
  icon: Icon,
  iconClass,
  rowClass,
  clients,
  emptyText,
  renderExtra,
}: {
  title: string;
  description: string;
  icon: typeof TrendingUp;
  iconClass: string;
  rowClass: string;
  clients: Client[];
  emptyText: string;
  renderExtra: (c: Client) => ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconClass} />
          <CardTitle>
            {title} <span className="text-muted-foreground font-normal">({clients.length})</span>
          </CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {clients.map((c) => (
              <Link
                key={c.id}
                to={`/clients/${c.id}`}
                className={`flex items-center justify-between rounded-md px-4 py-3 text-sm hover:brightness-125 transition-all ${rowClass}`}
              >
                <span className="font-medium">{c.name}</span>
                {renderExtra(c)}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
