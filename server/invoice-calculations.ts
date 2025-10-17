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

    const net = roundCurrency(qty * unitNet);
    const vat = roundCurrency(net * (vatRate / 100));
    const gross = roundCurrency(net + vat);

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
    totals,
  };
}