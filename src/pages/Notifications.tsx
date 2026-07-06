import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Save } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { formatPercent, formatDateTime, milestoneBadgeClass } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Notifications() {
  const { data, setAlertEmail } = useAppData();
  const [email, setEmail] = useState(data.settings.alert_email);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setAlertEmail(email);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every milestone triggers a mocked email alert to the address below.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-primary" />
            <CardTitle>Alert Recipient</CardTitle>
          </div>
          <CardDescription>
            Milestone alerts from CSV uploads are sent to this address via Resend. Seed/sample data is not re-sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-md">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@filinvestcity.com"
            />
            <Button onClick={handleSave}>
              <Save size={14} /> {saved ? "Saved" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Log</CardTitle>
          <CardDescription>{data.notifications.length} milestone alert(s) recorded</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {data.notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No alerts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Milestone</th>
                    <th>Payment %</th>
                    <th>Timestamp</th>
                    <th>Sent To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.notifications.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <Link to={`/clients/${n.client_id}`} className="hover:text-primary hover:underline">
                          {n.client_name}
                        </Link>
                      </td>
                      <td>
                        <span className={milestoneBadgeClass(n.milestone)}>
                          {n.milestone}
                        </span>
                      </td>
                      <td className="font-mono">{formatPercent(n.payment_percentage)}</td>
                      <td className="text-muted-foreground">{formatDateTime(n.timestamp)}</td>
                      <td className="text-muted-foreground text-xs">{n.sent_to}</td>
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
        </CardContent>
      </Card>
    </div>
  );
}
