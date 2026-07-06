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
import { format } from "date-fns";

export interface TimelinePoint {
  date: string; // ISO
  pct: number;
}

interface PaymentTimelineChartProps {
  points: TimelinePoint[];
  height?: number;
}

/**
 * Simple line chart: one tick per real data point, sorted chronologically.
 * No forced monthly grid, no slider — just the real history, plainly shown.
 */
export function PaymentTimelineChart({ points, height = 260 }: PaymentTimelineChartProps) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No payment history recorded yet.</p>;
  }

  const data = points
    .map((p) => ({ date: p.date, label: format(new Date(p.date), "MMM d, yyyy"), pct: Number(p.pct.toFixed(2)) }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
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
  );
}
