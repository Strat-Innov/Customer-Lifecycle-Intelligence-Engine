import { Link } from "react-router-dom";
import { Users, TrendingUp, Percent, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { groupForecastByType } from "@/lib/forecast";
import { formatPercent, formatDateTime, milestoneBadgeClass } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function Dashboard() {
  const { data, displayName } = useAppData();
  const { clients, notifications } = data;

  const totalClients = clients.length;
  const avgPayment =
    clients.length > 0 ? clients.reduce((sum, c) => sum + c.payment_percentage, 0) / clients.length : 0;
  const reached10 = clients.filter((c) => c.milestones_reached.includes("10% Payment")).length;
  const creqComplete = clients.filter((c) => c.milestones_reached.includes("CREQ")).length;

  const forecast = groupForecastByType(data);
  const recent = notifications.slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time overview of buyer payments and documentation milestones.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Clients" value={String(totalClients)} />
        <StatCard icon={Percent} label="Avg. Payment %" value={formatPercent(avgPayment)} mono />
        <StatCard icon={TrendingUp} label="10% Reached" value={String(reached10)} />
        <StatCard icon={CheckCircle2} label="CREQ Complete" value={String(creqComplete)} />
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Forecast Summary
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ForecastCard
            title="Approaching 10%"
            count={forecast.approaching10.length}
            className="forecast-approaching"
            icon={TrendingUp}
            iconClass="text-warning"
          />
          <ForecastCard
            title="Projected 10% (30d)"
            count={forecast.projected10Next30.length}
            className="forecast-approaching"
            icon={TrendingUp}
            iconClass="text-primary"
          />
          <ForecastCard
            title="Near CREQ"
            count={forecast.nearCreq.length}
            className="forecast-near-creq"
            icon={CheckCircle2}
            iconClass="text-success"
          />
          <ForecastCard
            title="Inactive Payments"
            count={forecast.inactive.length}
            className="forecast-inactive"
            icon={AlertTriangle}
            iconClass="text-destructive"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Milestones
          </h2>
          <Link to="/notifications" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        <Card>
          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No milestones triggered yet. Upload a CSV to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Milestone</th>
                    <th>Payment %</th>
                    <th>Timestamp</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <Link to={`/clients/${n.client_id}`} className="hover:text-primary hover:underline">
                          {displayName(n.client_name)}
                        </Link>
                      </td>
                      <td>
                        <span className={milestoneBadgeClass(n.milestone)}>
                          {n.milestone}
                        </span>
                      </td>
                      <td className="font-mono">{formatPercent(n.payment_percentage)}</td>
                      <td className="text-muted-foreground">{formatDateTime(n.timestamp)}</td>
                      <td>
                        <Badge variant={n.email_sent ? "success" : "outline"}>
                          {n.email_sent ? "Sent" : "Queued"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon size={16} className="text-primary" />
      </div>
      <span className={mono ? "font-mono text-2xl font-bold" : "text-2xl font-bold"}>{value}</span>
    </div>
  );
}

function ForecastCard({
  title,
  count,
  className,
  icon: Icon,
  iconClass,
}: {
  title: string;
  count: number;
  className: string;
  icon: typeof Clock;
  iconClass: string;
}) {
  return (
    <Link to="/forecast" className={`glass-card p-5 flex items-center justify-between ${className}`}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold font-mono">{count}</p>
      </div>
      <Icon size={22} className={iconClass} />
    </Link>
  );
}
