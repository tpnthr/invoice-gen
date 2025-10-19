import { type InvoiceForm } from "@shared/schema";

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

export function convertAudatexToInvoice(payload: unknown, base: InvoiceForm): InvoiceForm {
  const invoice: InvoiceForm = JSON.parse(JSON.stringify(base));
  invoice.items = [];

  const entries = Array.isArray(payload) ? payload : [payload];
  const firstEntry = entries[0] as Record<string, unknown> | undefined;
  if (!firstEntry || typeof firstEntry !== "object") {
    throw new Error("Nieprawidłowy format danych kalkulacji");
  }

  const calculation = firstEntry["Calculation"] as Record<string, any> | undefined;
  if (!calculation) {
    throw new Error("Brak sekcji Calculation w danych");
  }

  const finalCalc = calculation["FinalCalc"] ?? {};
  const grandTotal = finalCalc?.GrandTotal ?? {};

  const vatRate =
    parseNumber(grandTotal?.TaxPC?.Val) ??
    parseNumber(grandTotal?.Taxes?.Tax?.PC?.Val) ??
    23;

  const addItem = (item: InvoiceForm["items"][number]) => {
    invoice.items.push({
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
      kjc: part?.RepTyp || "",
      qty: quantity,
      uom,
      unit_net: unitNet,
      vat_rate: vatRate,
    });
  });

  // Sundry / percentage of parts (if present)
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
      kjc: "",
      qty,
      uom,
      unit_net: unitNet,
      vat_rate: vatRate,
    });
  };

  // Labor totals
  const laborTotal = parseCurrency(finalCalc?.FCLabor?.Tot?._);
  const laborRef = finalCalc?.FCLabor?.LaborRates?.LaborResults ??
    calculation?.Labor?.PartComposits?.PartComposit;
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

  if (invoice.items.length === 0) {
    throw new Error("Nie znaleziono pozycji do zaimportowania");
  }

  const runDesc = calculation?.RunDesc;
  if (runDesc) {
    const noteLine = `Źródło kalkulacji: ${String(runDesc)}`;
    invoice.document_notes = invoice.document_notes
      ? `${invoice.document_notes}\n${noteLine}`
      : noteLine;
  }

  return invoice;
}
