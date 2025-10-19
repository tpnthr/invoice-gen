import { type InvoiceForm, type InvoiceItem } from "@shared/schema";

const roundCurrency = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
};

export function calculateInvoiceTotals(data: InvoiceForm) {
  // Calculate item totals
  const calculatedItems = data.items.map(item => {
    const qty = parseFloat(item.qty?.toString() || "0") || 0;
    const unitNet = parseFloat(item.unit_net?.toString() || "0") || 0;
    const vatRate = parseFloat(item.vat_rate?.toString() || "0") || 0;

    const providedNet = item.net ?? undefined;
    const providedVat = item.vat ?? undefined;
    const providedGross = item.gross ?? undefined;

    const net = roundCurrency(
      providedNet !== undefined ? providedNet : qty * unitNet
    );
    const vat = roundCurrency(
      providedVat !== undefined ? providedVat : net * (vatRate / 100)
    );
    const gross = roundCurrency(
      providedGross !== undefined ? providedGross : net + vat
    );

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

  // Calculate VAT summary
  const vatRates: { [key: number]: { net: number; vat: number; gross: number } } = {};
  
  calculatedItems.forEach(item => {
    const rate = item.vat_rate;
    if (!vatRates[rate]) {
      vatRates[rate] = { net: 0, vat: 0, gross: 0 };
    }
    vatRates[rate].net = roundCurrency(vatRates[rate].net + item.net);
    vatRates[rate].vat = roundCurrency(vatRates[rate].vat + item.vat);
    vatRates[rate].gross = roundCurrency(vatRates[rate].gross + item.gross);
  });

  const vatSummary = Object.entries(vatRates)
    .filter(([_, totals]) => totals.net > 0)
    .map(([rate, totals]) => ({
      rate: Number(rate),
      net: totals.net,
      vat: totals.vat,
      gross: totals.gross,
    }));

  // Calculate totals
  const totals = calculatedItems.reduce(
    (acc, item) => ({
      net: roundCurrency(acc.net + item.net),
      vat: roundCurrency(acc.vat + item.vat),
      gross: roundCurrency(acc.gross + item.gross),
    }),
    { net: 0, vat: 0, gross: 0 }
  );

  return {
    ...data,
    calculatedItems,
    vatSummary,
    totals,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}
