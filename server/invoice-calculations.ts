import { type InvoiceForm } from "@shared/schema";

const roundCurrency = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
};

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const num = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(num) ? num : undefined;
};

export function calculateInvoiceTotals(data: InvoiceForm) {
  let totalVatRaw = 0;

  // Calculate item totals
  const calculatedItems = data.items.map(item => {
    const qty = parseOptionalNumber(item.qty) ?? 0;
    const unitNet = parseOptionalNumber(item.unit_net) ?? 0;
    const vatRate = parseOptionalNumber(item.vat_rate) ?? 0;

    const providedNet = parseOptionalNumber(item.net);
    const providedVat = parseOptionalNumber(item.vat);
    const providedGross = parseOptionalNumber(item.gross);

    const rawNet = providedNet ?? qty * unitNet;
    const rawVat =
      providedVat ??
      (providedGross !== undefined && providedNet !== undefined
        ? providedGross - providedNet
        : rawNet * (vatRate / 100));
    const rawGross = providedGross ?? rawNet + rawVat;

    totalVatRaw += Number.isFinite(rawVat) ? rawVat : 0;

    const net = roundCurrency(rawNet);
    const vat = roundCurrency(rawVat);
    const gross = roundCurrency(rawGross);

    return {
      ...item,
      qty,
      unit_net: unitNet,
      vat_rate: vatRate,
      net,
      vat,
      gross,
    };
  });

  // Calculate totals
  const totalNetInCents = calculatedItems.reduce(
    (acc, item) => acc + Math.round((item.net ?? 0) * 100),
    0
  );

  const totalNet = roundCurrency(totalNetInCents / 100);
  const totalVat = roundCurrency(totalVatRaw);

  const totals = {
    net: totalNet,
    vat: totalVat,
    gross: roundCurrency(totalNet + totalVat),
  };

  return {
    ...data,
    calculatedItems,
    totals,
  };
}
