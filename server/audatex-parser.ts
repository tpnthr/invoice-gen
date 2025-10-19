import { parseAudatexExport } from "@shared/audatex";
import { type AutomationInvoiceRequest } from "@shared/schema";

export interface ParsedAudatexPayload extends AutomationInvoiceRequest {
  invoice_number?: string;
}

export function parseAudatexPayload(payload: unknown): ParsedAudatexPayload {
  const parsed = parseAudatexExport(payload);

  return {
    invoice_number: parsed.invoice_number,
    buyer: {},
    items: parsed.items.map((item) => ({
      name: item.name,
      code: item.code,
      kjc: item.kjc,
      qty: item.qty,
      uom: item.uom,
      unit_net: item.unit_net,
      vat_rate: item.vat_rate,
    })),
    claim_number: parsed.claim_number,
    vehicle: parsed.vehicle,
    document_notes: parsed.document_notes,
  };
}
