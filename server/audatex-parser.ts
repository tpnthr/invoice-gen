import { type AutomationInvoiceRequest } from "@shared/schema";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const extractNumeric = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[+\s]/g, "");
    const parsed = Number.parseFloat(normalized.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (isRecord(value)) {
    if ("_" in value) {
      return extractNumeric((value as Record<string, unknown>)["_"]);
    }

    if ("Val" in value) {
      return extractNumeric((value as Record<string, unknown>)["Val"]);
    }
  }

  return undefined;
};

const roundCurrency = (value: number | undefined): number | undefined => {
  if (!Number.isFinite(value ?? NaN)) return undefined;
  return Math.round((value as number) * 100) / 100;
};

const buildVehicleSummary = (root: Record<string, unknown>): string | undefined => {
  const vehicle = isRecord(root.Vehicle) ? root.Vehicle : undefined;
  if (!vehicle) return undefined;

  const identification = isRecord(vehicle.VehicleIdentification)
    ? vehicle.VehicleIdentification
    : undefined;
  const admin = isRecord(vehicle.VehicleAdmin) ? vehicle.VehicleAdmin : undefined;

  const vin = typeof identification?.VIN === "string" ? identification.VIN.trim() : undefined;
  const model = typeof identification?.ModelName === "string" ? identification.ModelName.trim() : undefined;
  const plate = typeof admin?.PlateNumber === "string" ? admin.PlateNumber.trim() : undefined;

  const parts = [vin, model, plate].filter((part): part is string => Boolean(part && part.length));
  return parts.length > 0 ? parts.join(" | ") : undefined;
};

const buildNotes = (root: Record<string, unknown>): string | undefined => {
  const calculation = isRecord(root.Calculation) ? root.Calculation : undefined;
  const runDesc = typeof calculation?.RunDesc === "string" ? calculation.RunDesc.trim() : undefined;
  const vehicle = isRecord(root.Vehicle) ? root.Vehicle : undefined;
  const damage = isRecord(vehicle?.VehicleDamage) ? vehicle?.VehicleDamage : undefined;

  const notes: string[] = [];
  if (runDesc) {
    notes.push(`Źródło: Audatex (${runDesc})`);
  }

  const damagePoints = typeof damage?.DamagePoints === "string" ? damage.DamagePoints.trim() : undefined;
  if (damagePoints) {
    notes.push(`Punkty uszkodzeń: ${damagePoints}`);
  }

  return notes.length > 0 ? notes.join("\n") : undefined;
};

export interface ParsedAudatexPayload extends AutomationInvoiceRequest {
  invoice_number?: string;
}

export function parseAudatexPayload(payload: unknown): ParsedAudatexPayload {
  if (!Array.isArray(payload) || payload.length === 0 || !isRecord(payload[0])) {
    throw new Error("Oczekiwano tablicy z obiektami kalkulacji Audatex");
  }

  const root = payload[0] as Record<string, unknown>;
  const calculation = isRecord(root.Calculation) ? root.Calculation : undefined;
  const finalCalc = isRecord(calculation?.FinalCalc) ? calculation?.FinalCalc : undefined;
  const grandTotal = isRecord(finalCalc?.GrandTotal) ? finalCalc?.GrandTotal : undefined;

  let vatRateSource: unknown = grandTotal?.TaxPC;
  if (!vatRateSource && isRecord(grandTotal?.Taxes)) {
    const taxesRecord = grandTotal.Taxes as Record<string, unknown>;
    vatRateSource = taxesRecord.Tax;
  }

  const vatRate = roundCurrency(extractNumeric(vatRateSource) ?? 23) ?? 23;

  const categories: Array<{ label: string; amount?: number }> = [
    {
      label: "Części",
      amount: extractNumeric(
        isRecord(finalCalc?.FCPart) ? (finalCalc.FCPart as Record<string, unknown>).SubTot : undefined,
      ),
    },
    {
      label: "Robocizna",
      amount: extractNumeric(
        isRecord(finalCalc?.FCLabor) ? (finalCalc.FCLabor as Record<string, unknown>).Tot : undefined,
      ),
    },
    {
      label: "Lakierowanie",
      amount: extractNumeric(
        isRecord(finalCalc?.FCPaint) ? (finalCalc.FCPaint as Record<string, unknown>).PaintTotOverAll : undefined,
      ),
    },
    {
      label: "Koszty dodatkowe",
      amount: extractNumeric(
        isRecord(finalCalc?.FCAdditionalCost)
          ? (finalCalc.FCAdditionalCost as Record<string, unknown>).Tot
          : undefined,
      ),
    },
  ];

  const items: NonNullable<AutomationInvoiceRequest["items"]> = [];

  for (const category of categories) {
    const rounded = roundCurrency(category.amount);
    if (rounded && rounded > 0) {
      items.push({
        name: category.label,
        qty: 1,
        uom: "usł.",
        unit_net: rounded,
        vat_rate: vatRate,
      });
    }
  }

  if (items.length === 0) {
    const fallback = roundCurrency(extractNumeric(grandTotal?.RepTot ?? grandTotal?.Tot));
    if (!fallback || fallback <= 0) {
      throw new Error("Nie można odczytać wartości netto z kalkulacji Audatex");
    }

    items.push({
      name: "Naprawa pojazdu",
      qty: 1,
      uom: "usł.",
      unit_net: fallback,
      vat_rate: vatRate,
    });
  }

  const claimNumber = typeof root.ClaimID === "string" ? root.ClaimID.trim() : undefined;
  const vehicle = buildVehicleSummary(root);
  const documentNotes = buildNotes(root);

  const invoiceNumber = claimNumber ? `AUDATEX/${claimNumber.replace(/\s+/g, "")}` : undefined;

  return {
    invoice_number: invoiceNumber,
    buyer: {},
    items,
    claim_number: claimNumber,
    vehicle,
    document_notes: documentNotes,
  };
}
