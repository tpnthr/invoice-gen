import { type InvoiceItem } from "./schema";

const roundCurrency = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
};

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value
      .replace(/[^0-9,.-]/g, "")
      .replace(/,/g, ".");
    if (!normalized) return undefined;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (typeof value === "object" && value !== null) {
    if ("_" in (value as Record<string, unknown>)) {
      return parseNumber((value as Record<string, unknown>)["_"]);
    }
    if ("Val" in (value as Record<string, unknown>)) {
      return parseNumber((value as Record<string, unknown>)["Val"]);
    }
  }
  return undefined;
};

const parseCurrency = (value: unknown): number => {
  const parsed = parseNumber(value);
  return parsed !== undefined ? parsed : 0;
};

const normalizeArray = <T>(input: T | T[] | undefined | null): T[] => {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
};

const cleanText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const withoutBracketCodes = value.replace(/\[[^\]]*\]/g, " ");
  const normalized = withoutBracketCodes.replace(/\s+/g, " ").trim();
  return normalized || undefined;
};

export interface ParsedAudatexData {
  items: InvoiceItem[];
  claim_number?: string;
  vehicle?: string;
  document_notes?: string;
  invoice_number?: string;
}

export function parseAudatexData(payload: unknown): ParsedAudatexData {
  const entries = Array.isArray(payload) ? payload : [payload];
  const firstEntry = entries[0] as Record<string, unknown> | undefined;
  if (!firstEntry || typeof firstEntry !== "object") {
    throw new Error("Nieprawidłowy format danych kalkulacji");
  }

  const calculation = firstEntry["Calculation"] as Record<string, any> | undefined;
  if (!calculation) {
    throw new Error("Brak sekcji Calculation w danych");
  }

  const claimNumber = cleanText(firstEntry["ClaimID"]);

  const vehicleData = firstEntry["Vehicle"] as Record<string, unknown> | undefined;
  let vehicle: string | undefined;
  if (vehicleData && typeof vehicleData === "object") {
    const identification = vehicleData["VehicleIdentification"] as Record<string, unknown> | undefined;
    const admin = vehicleData["VehicleAdmin"] as Record<string, unknown> | undefined;

    const manufacturer = cleanText(identification?.["ManufacturerName"]);
    const subModel = cleanText(identification?.["SubModelName"]);
    const model = cleanText(identification?.["ModelName"]);
    const plateNumber = cleanText(admin?.["PlateNumber"]);

    const vehicleParts = [manufacturer, subModel || model, plateNumber].filter(
      (part): part is string => Boolean(part)
    );

    if (vehicleParts.length > 0) {
      vehicle = vehicleParts.join(" ");
    }
  }

  const finalCalc = calculation["FinalCalc"] ?? {};
  const grandTotal = finalCalc?.GrandTotal ?? {};

  const vatRate =
    parseNumber(grandTotal?.TaxPC?.Val) ??
    parseNumber(grandTotal?.Taxes?.Tax?.PC?.Val) ??
    23;
  const normalizedVatRate = roundCurrency(vatRate);

  const items: InvoiceItem[] = [];

  const addItem = (item: InvoiceItem) => {
    items.push({
      ...item,
      qty: roundCurrency(item.qty),
      unit_net: roundCurrency(item.unit_net),
      vat_rate: roundCurrency(item.vat_rate),
    });
  };

  // Parts details
  const partDetails = normalizeArray(calculation?.SpareParts?.PartDtls?.PartDtl);
  partDetails.forEach((part) => {
    if (!part) return;
    const total = parseCurrency(part?.Price?._);
    if (total <= 0) return;

    const qty = parseNumber(part?.Qty?.Val) ?? 1;
    const quantity = qty > 0 ? qty : 1;
    const uom = part?.Qty?.Unit || "szt";
    const unitNet = quantity ? roundCurrency(total / quantity) : roundCurrency(total);

    addItem({
      name: String(part?.PartDesc || part?.PartNo || "Część"),
      code: part?.PartNo || "",
      qty: quantity,
      uom,
      unit_net: unitNet,
      vat_rate: normalizedVatRate,
    });
  });

  // Sundry / percentage of parts (if present)
  const sundryAmount = parseCurrency(finalCalc?.FCPart?.FCSundry?.PCofParts?.PCofPart?.Amnt?._);
  if (sundryAmount > 0) {
    addItem({
      name: "Materiały dodatkowe (FCSundry)",
      code: "",
      qty: 1,
      uom: "usł",
      unit_net: sundryAmount,
      vat_rate: normalizedVatRate,
    });
  }

  const addServiceItem = (
    label: string,
    amount: number,
    quantity?: number,
    unit?: string
  ) => {
    const total = roundCurrency(amount);
    if (total <= 0) return;
    const qty = quantity && quantity > 0 ? quantity : 1;
    const uom = unit || "usł";
    const unitNet = qty ? roundCurrency(total / qty) : total;

    addItem({
      name: label,
      code: "",
      qty,
      uom,
      unit_net: unitNet,
      vat_rate: normalizedVatRate,
    });
  };

  // Labor totals
  const laborTotal = parseCurrency(finalCalc?.FCLabor?.Tot?._);
  const laborRef =
    finalCalc?.FCLabor?.LaborRates?.LaborResults ?? calculation?.Labor?.PartComposits?.PartComposit;
  const laborArray = normalizeArray(laborRef);
  const firstLabor = laborArray[0] as Record<string, any> | undefined;
  const laborHours =
    parseNumber(firstLabor?.HrNo?.Val) ??
    parseNumber(firstLabor?.WuNetHrNo?.Val) ??
    parseNumber(finalCalc?.FCLabor?.LaborRates?.LaborResults?.HrNo?.Val);
  const laborUnit = firstLabor?.HrNo?.Unit || firstLabor?.WuNetHrNo?.Unit || "h";
  addServiceItem("Robocizna", laborTotal, laborHours, laborUnit);

  // Additional costs
  const additionalTotal = parseCurrency(finalCalc?.FCAdditionalCost?.Tot?._);
  addServiceItem("Koszty dodatkowe", additionalTotal);

  // Paint totals
  const paintTotal = parseCurrency(finalCalc?.FCPaint?.PaintTotOverAll?._);
  const paintHours =
    parseNumber(calculation?.Paint?.PaintTotLbr?.TotStd?.Val) ??
    parseNumber(calculation?.Paint?.PaintPreparations?.PntPrep?.HrNo?.Val);
  const paintUnit =
    calculation?.Paint?.PaintTotLbr?.TotStd?.Unit ||
    calculation?.Paint?.PaintPreparations?.PntPrep?.HrNo?.Unit ||
    "h";
  addServiceItem("Lakierowanie", paintTotal, paintHours, paintUnit);

  if (items.length === 0) {
    throw new Error("Nie znaleziono pozycji do zaimportowania");
  }

  const notes: string[] = [];
  const runDesc = calculation?.RunDesc;
  if (runDesc) {
    notes.push(`Źródło kalkulacji: ${String(runDesc)}`);
  }

  const damageInfo = vehicleData?.["VehicleDamage"] as Record<string, unknown> | undefined;
  const damagePoints = cleanText(damageInfo?.["DamagePoints"]);
  if (damagePoints) {
    notes.push(`Punkty uszkodzeń: ${damagePoints}`);
  }

  const documentNotes = notes.length > 0 ? notes.join("\n") : undefined;

  const invoiceNumber = claimNumber ? `AUDATEX/${claimNumber.replace(/\s+/g, "")}` : undefined;

  return {
    items,
    claim_number: claimNumber,
    vehicle,
    document_notes: documentNotes,
    invoice_number: invoiceNumber,
  };
}
