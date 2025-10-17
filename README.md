# Invoice Generator

Invoice Generator is a full-stack application for managing VAT invoices. It exposes a REST API for creating, updating, and automating invoice workflows while serving a web client built with Vite and React.

## Project Structure

- **client/** – Vite + React front-end for interacting with invoices.
- **server/** – Express API, database access (Drizzle ORM + PostgreSQL), automation utilities.
- **shared/** – Shared Zod/Drizzle schemas that define the invoice domain model.

## Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)

## Environment Variables

Create a `.env` file in the project root or supply the variables through your deployment platform.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string. Required by the API on startup. |
| `DATABASE_USE_NEON_WEBSOCKETS` | ⛔️ | Optional flag (`true/false`) to force WebSocket mode when using Neon. Auto-detected otherwise. |
| `PORT` | ⛔️ | Port for the Express server (defaults to `5000`). |
| `AUTOMATION_SECRET` | ⛔️ | Shared secret for automation endpoints. Required to accept automation traffic. |
| `WEBHOOK_ALLOWED_DOMAINS` | ⛔️ | Comma-separated hostnames allowed for webhook callbacks (defaults to `localhost,127.0.0.1`). |
| `WEBHOOK_SECRET` | ⛔️ | Secret used to sign webhook payloads when an invoice is completed. |
| `DEFAULT_SELLER_*` | ⛔️ | Optional defaults (`NAME`, `NIP`, `ADDRESS_1`, `ADDRESS_2`, `PHONE`, `BANK`, `BANK_ADDRESS`, `IBAN`) that fill in seller data for automation requests. |

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Apply database migrations (if you have Drizzle migrations configured) and ensure the database is reachable through `DATABASE_URL`.

3. Start the API and client with Vite:

   ```bash
   npm run dev
   ```

   The server listens on `http://localhost:5000` by default and proxies the client app in development.

## API Overview

All endpoints return JSON. For errors, the API responds with a `message` field and, when validation fails, an `errors` array from Zod.

### Authentication

- Standard CRUD endpoints are currently unsecured.
- Automation endpoints require the `AUTOMATION_SECRET` to be configured and provided via the `x-automation-secret` header.

### Invoice Object

Every invoice returned by the API follows the schema defined in [`shared/schema.ts`](./shared/schema.ts):

```ts
{
  id: string;
  invoice_number: string;
  issue_date: string; // ISO date (YYYY-MM-DD)
  delivery_date: string; // ISO date
  issue_place: string;
  copy_type: string; // e.g. "ORYGINAŁ"
  seller: InvoiceParty; // name, nip, address, etc.
  buyer: InvoiceParty;
  items: InvoiceItem[]; // name, qty, unit_net, vat_rate, ...
  payment_terms?: string;
  payment_type: string; // e.g. "przelew"
  document_notes?: string;
  claim_number?: string;
  vehicle?: string;
  total_net: string; // decimal stored as string
  total_vat: string;
  total_gross: string;
  template_id?: string;
  webhook_url?: string;
  status: "draft" | "completed" | ...;
  webhook_completed: boolean;
  created_at: string;
}
```

Numbers are serialized as strings for totals because PostgreSQL decimals are returned as strings by Drizzle.

### Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/invoices` | List all invoices. |
| `GET` | `/api/invoices/:id` | Retrieve a specific invoice. Returns `404` when missing. |
| `POST` | `/api/invoices` | Create a new invoice. Validates against `insertInvoiceSchema`. |
| `PUT` | `/api/invoices/:id` | Update fields on an existing invoice. Recalculates totals. |
| `DELETE` | `/api/invoices/:id` | Delete an invoice. Returns `204` with an empty body. |
| `POST` | `/api/invoices/from-automation` | Create an invoice from an automation workflow (n8n, etc.). Requires `x-automation-secret`. |
| `POST` | `/api/invoices/:id/complete` | Mark an invoice as completed, triggering a signed webhook if configured. Requires `x-automation-secret`. |

### Creating an Invoice

```http
POST /api/invoices
Content-Type: application/json

{
  "invoice_number": "FV/2024/001",
  "issue_date": "2024-05-20",
  "delivery_date": "2024-05-20",
  "issue_place": "Warszawa",
  "copy_type": "ORYGINAŁ",
  "seller": {
    "name": "ACME Sp. z o.o.",
    "nip": "123-456-78-90",
    "address_line_1": "ul. Przykładowa 1",
    "address_line_2": "00-001 Warszawa"
  },
  "buyer": {
    "name": "Klient SA",
    "nip": "987-654-32-10",
    "address_line_1": "al. Klienta 2",
    "address_line_2": "00-950 Warszawa"
  },
  "items": [
    {
      "name": "Usługa serwisowa",
      "qty": 1,
      "uom": "szt",
      "unit_net": 1000,
      "vat_rate": 23
    }
  ],
  "payment_terms": "14 dni",
  "payment_type": "przelew"
}
```

**Response 201**

```json
{
  "id": "5e9d6f8c-f6b0-4d45-8f21-2d913ad91894",
  "invoice_number": "FV/2024/001",
  "total_net": "1000.00",
  "total_vat": "230.00",
  "total_gross": "1230.00",
  "status": "draft",
  "created_at": "2024-05-20T10:55:22.000Z",
  ...
}
```

Totals are recalculated server-side before persisting.

### Automation Workflow

Automation requests are validated with a more permissive schema and can omit many fields. Defaults are populated from environment variables or built-in fallbacks.

```http
POST /api/invoices/from-automation
Content-Type: application/json
x-automation-secret: YOUR_SECRET

{
  "buyer": {
    "name": "Klient Automatyczny",
    "nip": "987-654-32-10",
    "address_line_1": "ul. Automatyczna 5",
    "address_line_2": "00-321 Warszawa"
  },
  "items": [
    {
      "name": "Subskrypcja",
      "qty": 1,
      "uom": "mies",
      "unit_net": 299,
      "vat_rate": 23
    }
  ],
  "payment_terms": "7 dni",
  "webhook_url": "https://hooks.example.com/invoices"
}
```

**Response 201**

```json
{
  "invoice": { /* full invoice object */ },
  "edit_url": "https://your-host/edit/<invoiceId>"
}
```

The automation completion endpoint (`/api/invoices/:id/complete`) marks the invoice status as `completed` and, when a `webhook_url` is stored and `WEBHOOK_SECRET` is set, sends a signed webhook payload to the provided URL.

### Webhook Payload

```json
{
  "event": "invoice_completed",
  "invoice_id": "5e9d6f8c-f6b0-4d45-8f21-2d913ad91894",
  "invoice_number": "FV/2024/001",
  "total_gross": "1230.00",
  "buyer": { ... },
  "items": [ ... ],
  "completed_at": "2024-05-20T12:00:00.000Z"
}
```

The payload is signed with an `X-Webhook-Signature` header using `sha256=<hex HMAC>` and the `WEBHOOK_SECRET`.

## Production Deployment

- Provide all required environment variables, especially `DATABASE_URL` and `AUTOMATION_SECRET` if automation is used.
- Ensure HTTPS termination is handled by your hosting platform.
- Configure the allowed webhook domains to prevent callbacks to untrusted endpoints.

## Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the development server (client + API). |
| `npm run build` | Builds the client for production. |
| `npm run preview` | Serves the built client with the API. |

