import type { Notification } from "@/types";

export async function sendMilestoneAlerts(
  notifications: Notification[],
  to: string
): Promise<Notification[]> {
  return Promise.all(
    notifications.map(async (n) => {
      try {
        const response = await fetch("/api/send-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to,
            client_name: n.client_name,
            milestone: n.milestone,
            payment_percentage: n.payment_percentage,
          }),
        });
        return { ...n, email_sent: response.ok };
      } catch (error) {
        console.error(`Failed to send milestone alert for ${n.client_name}:`, error);
        return { ...n, email_sent: false };
      }
    })
  );
}
