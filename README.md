# Filinvest Milestone Tracker

Internal admin tool for the operations team to monitor real estate buyer payments and documentation status, detect milestones, forecast upcoming ones, and log (mocked) email alerts.

## Stack

React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui-style primitives + React Router + Recharts. All data persists in the browser's `localStorage` — no backend in v1.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## CSV format

```csv
name,contract_value,payment_to_date,documents_submitted
Maria Santos,5000000,475000,Valid ID;Proof of Income;Tax Returns
```

- Documents are separated with `;`
- `payment_percentage` is computed automatically
- Existing clients are matched by name (case-insensitive) and updated; unmatched names create new client records
- Milestones (`10% Payment`, `CREQ`) are detected by comparing the new state to each client's prior `milestones_reached`, and a mocked `Notification` (email_sent: true) is logged per newly crossed milestone

## Alert recipient

The email address that (mock) milestone alerts are sent to is configurable in-app under **Notifications → Alert Recipient**. Default seed value: `joseph.bagadiong@filinvestcity.com`.

## Out of scope for v1

- Real email delivery (queued/mocked only)
- Authentication / multi-user roles
- A backend database (everything lives in `localStorage`, per-browser)

## Deploy

This is a static SPA — deploy the `dist/` output anywhere static, or connect the GitHub repo to Vercel directly. `vercel.json` includes the SPA rewrite rule needed for client-side routes like `/clients/:id`.
