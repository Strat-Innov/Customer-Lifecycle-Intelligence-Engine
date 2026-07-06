import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from "recharts";
import { eachMonthOfInterval, startOfMonth, format } from "date-fns";

export interface TimelinePoint {
  date: string; // ISO
  pct: number;
}

interface PaymentTimelineChartProps {
  points: TimelinePoint[];
  height?: number;
}

/**
 * Renders payment percentage against a real time-scale x-axis (not a
 * category axis), so the gap between sparse data points — e.g. a contract
 * credited years ago with only one or two recorded percentages so far —
 * is visually honest instead of collapsing to a single tick. Domain always
 * extends through today, since more real uploads will add more real points
 * along the same axis over time.
 */
export function PaymentTimelineChart({ points, height = 260 }: PaymentTimelineChartProps) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No payment history recorded yet.</p>;
  }

  const data = points
    .map((p) => ({ ts: new Date(p.date).getTime(), pct: Number(p.pct.toFixed(2)) }))
    .sort((a, b) => a.ts - b.ts);

  const domainStart = startOfMonth(data[0].ts).getTime();
  const domainEnd = Math.max(Date.now(), data[data.length - 1].ts);
  const ticks = eachMonthOfInterval({ start: domainStart, end: domainEnd }).map((d) => d.getTime());

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={[domainStart, domainEnd]}
            ticks={ticks}
            tickFormatter={(ts) => format(ts, "MMM yyyy")}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
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
            labelFormatter={(ts) => format(ts as number, "MMM d, yyyy")}
            formatter={(v) => [`${v}%`, "Payment"]}
          />
          <Line
            type="monotone"
            dataKey="pct"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
          />
          <Brush
            dataKey="ts"
            height={22}
            stroke="hsl(var(--primary))"
            fill="hsl(var(--secondary))"
            travellerWidth={8}
            tickFormatter={(ts) => format(ts as number, "MMM yyyy")}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
