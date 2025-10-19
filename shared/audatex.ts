import { type InvoiceItem } from "./schema";

type AudatexItem = Pick<InvoiceItem, "name" | "code" | "kjc" | "qty" | "uom" | "unit_net" | "vat_rate">;

export interface AudatexParseResult {
  items: AudatexItem[];
  claim_number?: string;
  vehicle?: string;
  document_notes?: string;
  invoice_number?: string;
}

const roundToTwoDecimals = (value: number) => {
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

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("_" in record) {
      return parseNumber(record._);
    }
    if ("Val" in record) {
      return parseNumber(record.Val);
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

export function parseAudatexExport(payload: unknown): AudatexParseResult {
  const entries = Array.isArray(payload) ? payload : [payload];
  const firstEntry = entries[0] as Record<string, unknown> | undefined;

  if (!firstEntry || typeof firstEntry !== "object") {
    throw new Error("Nieprawidłowy format danych kalkulacji");
  }

  const calculation = firstEntry["Calculation"] as Record<string, any> | undefined;
  if (!calculation) {
    throw new Error("Brak sekcji Calculation w danych");
  }

  const result: AudatexParseResult = {
    items: [],
  };

  const claimId = cleanText(firstEntry["ClaimID"]);
  if (claimId) {
    result.claim_number = claimId;
    result.invoice_number = `AUDATEX/${claimId.replace(/\s+/g, "")}`;
  }

  const vehicleData = firstEntry["Vehicle"] as Record<string, unknown> | undefined;
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
      result.vehicle = vehicleParts.join(" ");
    }
  }

  const finalCalc = calculation["FinalCalc"] ?? {};
  const grandTotal = finalCalc?.GrandTotal ?? {};

  const vatRate =
    parseNumber(grandTotal?.TaxPC?.Val) ??
    parseNumber(grandTotal?.Taxes?.Tax?.PC?.Val) ??
    23;

  const addItem = (item: AudatexItem) => {
    result.items.push({
      ...item,
      qty: roundToTwoDecimals(item.qty),
      unit_net: roundToTwoDecimals(item.unit_net),
      vat_rate: roundToTwoDecimals(item.vat_rate),
    });
  };

  const partDetails = normalizeArray(calculation?.SpareParts?.PartDtls?.PartDtl);
  partDetails.forEach((part) => {
    if (!part) return;
    const total = parseCurrency(part?.Price?._ ?? part?.Price);
    if (total <= 0) return;

    const qtyRaw = parseNumber(part?.Qty?.Val ?? part?.Qty);
    const quantity = qtyRaw && qtyRaw > 0 ? qtyRaw : 1;
    const uom = (part?.Qty?.Unit as string | undefined) || "szt";
    const unitNet = quantity ? roundToTwoDecimals(total / quantity) : roundToTwoDecimals(total);

    addItem({
      name: String(part?.PartDesc || part?.PartNo || "Pozycja"),
      code: (part?.PartNo as string | undefined) || "",
      kjc: (part?.RepTyp as string | undefined) || "",
      qty: quantity,
      uom,
      unit_net: unitNet,
      vat_rate: vatRate,
    });
  });

  const sundryAmount = parseCurrency(finalCalc?.FCPart?.FCSundry?.PCofParts?.PCofPart?.Amnt?._);
  if (sundryAmount > 0) {
    addItem({
      name: "Materiały dodatkowe (FCSundry)",
      code: "",
      kjc: "",
      qty: 1,
      uom: "usł",
      unit_net: sundryAmount,
      vat_rate: vatRate,
    });
  }

  const addServiceItem = (
    label: string,
    amount: number,
    quantity?: number,
    unit?: string,
  ) => {
    const total = roundToTwoDecimals(amount);
    if (total <= 0) return;
    const qty = quantity && quantity > 0 ? quantity : 1;
    const uom = unit || "usł";
    const unitNet = qty ? roundToTwoDecimals(total / qty) : total;

    addItem({
      name: label,
      code: "",
      kjc: "",
      qty,
      uom,
      unit_net: unitNet,
      vat_rate: vatRate,
    });
  };

  const laborTotal = parseCurrency(finalCalc?.FCLabor?.Tot?._ ?? finalCalc?.FCLabor?.Tot);
  const laborRef =
    finalCalc?.FCLabor?.LaborRates?.LaborResults ?? calculation?.Labor?.PartComposits?.PartComposit;
  const laborArray = normalizeArray(laborRef);
  const firstLabor = laborArray[0] as Record<string, any> | undefined;
  const laborHours =
    parseNumber(firstLabor?.HrNo?.Val ?? firstLabor?.HrNo) ??
    parseNumber(firstLabor?.WuNetHrNo?.Val ?? firstLabor?.WuNetHrNo) ??
    parseNumber(finalCalc?.FCLabor?.LaborRates?.LaborResults?.HrNo?.Val);
  const laborUnit =
    (firstLabor?.HrNo?.Unit as string | undefined) ||
    (firstLabor?.WuNetHrNo?.Unit as string | undefined) ||
    "h";
  addServiceItem("Robocizna", laborTotal, laborHours, laborUnit);

  const additionalTotal = parseCurrency(finalCalc?.FCAdditionalCost?.Tot?._ ?? finalCalc?.FCAdditionalCost?.Tot);
  addServiceItem("Koszty dodatkowe", additionalTotal);

  const paintTotal = parseCurrency(finalCalc?.FCPaint?.PaintTotOverAll?._ ?? finalCalc?.FCPaint?.PaintTotOverAll);
  const paintHours =
    parseNumber(calculation?.Paint?.PaintTotLbr?.TotStd?.Val ?? calculation?.Paint?.PaintTotLbr?.TotStd) ??
    parseNumber(calculation?.Paint?.PaintPreparations?.PntPrep?.HrNo?.Val);
  const paintUnit =
    (calculation?.Paint?.PaintTotLbr?.TotStd?.Unit as string | undefined) ||
    (calculation?.Paint?.PaintPreparations?.PntPrep?.HrNo?.Unit as string | undefined) ||
    "h";
  addServiceItem("Lakierowanie", paintTotal, paintHours, paintUnit);

  if (result.items.length === 0) {
    throw new Error("Nie znaleziono pozycji do zaimportowania");
  }

  const runDesc = calculation?.RunDesc;
  if (runDesc) {
    const noteLine = `Źródło kalkulacji: ${String(runDesc)}`;
    result.document_notes = result.document_notes
      ? `${result.document_notes}\n${noteLine}`
      : noteLine;
  }

  return result;
}
