import { type InvoiceForm, type InvoiceItem } from "@shared/schema";

export function calculateInvoiceTotals(data: InvoiceForm) {
  // Calculate item totals
  const calculatedItems = data.items.map(item => {
    const qty = parseFloat(item.qty?.toString() || "0") || 0;
    const unitNet = parseFloat(item.unit_net?.toString() || "0") || 0;
    const vatRate = parseFloat(item.vat_rate?.toString() || "0") || 0;
    
    const net = qty * unitNet;
    const vat = net * (vatRate / 100);
    const gross = net + vat;
    
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
    vatRates[rate].net += item.net;
    vatRates[rate].vat += item.vat;
    vatRates[rate].gross += item.gross;
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
      net: acc.net + item.net,
      vat: acc.vat + item.vat,
      gross: acc.gross + item.gross,
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
