import { parseAudatexExport } from "@shared/audatex";
import { type InvoiceForm } from "@shared/schema";

export function convertAudatexToInvoice(payload: unknown, base: InvoiceForm): InvoiceForm {
  const parsed = parseAudatexExport(payload);
  const invoice: InvoiceForm = JSON.parse(JSON.stringify(base));

  invoice.items = parsed.items.map((item) => ({
    ...item,
  }));

  if (parsed.claim_number) {
    invoice.claim_number = parsed.claim_number;
  }

  if (parsed.vehicle) {
    invoice.vehicle = parsed.vehicle;
  }

  if (parsed.document_notes) {
    invoice.document_notes = invoice.document_notes
      ? `${invoice.document_notes}\n${parsed.document_notes}`
      : parsed.document_notes;
  }

  return invoice;
}
