import { parseAudatexData } from "@shared/audatex-parser";
import { type AutomationInvoiceRequest } from "@shared/schema";

export interface ParsedAudatexPayload extends AutomationInvoiceRequest {
  invoice_number?: string;
}

export function parseAudatexPayload(payload: unknown): ParsedAudatexPayload {
  const parsed = parseAudatexData(payload);

  if (!parsed.items || parsed.items.length === 0) {
    throw new Error("Nie znaleziono pozycji do zaimportowania");
  }

  return {
    invoice_number: parsed.invoice_number,
    buyer: {},
    items: parsed.items,
    claim_number: parsed.claim_number,
    vehicle: parsed.vehicle,
    document_notes: parsed.document_notes,
  };
}
