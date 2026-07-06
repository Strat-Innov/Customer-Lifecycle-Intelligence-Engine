import type { VercelRequest, VercelResponse } from "@vercel/node";

interface SendAlertBody {
  to: string;
  client_name: string;
  milestone: string;
  payment_percentage: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in the environment");
  }

  const { to, client_name, milestone, payment_percentage } = req.body as SendAlertBody;
  if (!to || !client_name || !milestone || typeof payment_percentage !== "number") {
    res.status(400).json({ error: "Missing required fields: to, client_name, milestone, payment_percentage" });
    return;
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Filinvest Milestone Tracker <onboarding@resend.dev>",
      to: [to],
      subject: `Milestone reached: ${client_name} — ${milestone}`,
      html: `<p><strong>${client_name}</strong> has reached the <strong>${milestone}</strong> milestone.</p><p>Payment progress: ${payment_percentage.toFixed(2)}%</p>`,
    }),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    console.error(`Resend API rejected the request (${resendResponse.status}):`, errorText);
    res.status(502).json({ error: `Resend API error: ${errorText}` });
    return;
  }

  res.status(200).json({ sent: true });
}
