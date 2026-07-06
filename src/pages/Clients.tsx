import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function Clients() {
  const { data } = useAppData();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.clients;
    return data.clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [data.clients, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">{data.clients.length} buyers on record</p>
        </div>
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contract Value</th>
                <th>Paid to Date</th>
                <th>Payment %</th>
                <th>Docs Status</th>
                <th>Milestones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/clients/${c.id}`} className="font-medium hover:text-primary hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="font-mono">{formatCurrency(c.contract_value)}</td>
                  <td className="font-mono">{formatCurrency(c.payment_to_date)}</td>
                  <td className="font-mono">{formatPercent(c.payment_percentage)}</td>
                  <td>
                    <Badge variant={c.documentation_status.missing.length === 0 ? "success" : "outline"}>
                      {c.documentation_status.submitted.length}/{c.documentation_status.required.length} submitted
                    </Badge>
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      {c.milestones_reached.includes("10% Payment") && (
                        <span className="milestone-badge-10">10%</span>
                      )}
                      {c.milestones_reached.includes("CREQ") && (
                        <span className="milestone-badge-creq">CREQ</span>
                      )}
                      {c.milestones_reached.length === 0 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No clients match "{query}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
