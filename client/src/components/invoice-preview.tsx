import { type InvoiceForm } from "@shared/schema";
import { DEFAULT_SELLER } from "@shared/defaults";
import { formatCurrency } from "@/lib/invoice-calculations";
import { numberToWords } from "@/lib/number-to-words";

interface InvoicePreviewProps {
  data: InvoiceForm & {
    calculatedItems: Array<{
      name: string;
      code?: string;
      kjc?: string;
      qty: number;
      uom: string;
      unit_net: number;
      vat_rate: number;
      net: number;
      vat: number;
      gross: number;
    }>;
    vatSummary: Array<{
      rate: number;
      net: number;
      vat: number;
      gross: number;
    }>;
    totals: {
      net: number;
      vat: number;
      gross: number;
    };
  };
}

export function InvoicePreview({ data }: InvoicePreviewProps) {
  const seller = {
    ...DEFAULT_SELLER,
    ...data.seller,
  };

  const invoiceNumber = data.invoice_number || "000/2024/001";
  const copyType = data.copy_type || "ORYGINAŁ";
  const issuePlace = data.issue_place || "Warszawa";
  const issueDate = data.issue_date || "2024-01-01";
  const deliveryDate = data.delivery_date || "2024-01-01";

  return (
    <div className="invoice-preview" data-testid="invoice-preview">
      <div className="doc">
        {/* Header */}
        <header className="header">
          <section className="invoice-tag">
            <h1>
              Faktura VAT{" "}
              <span className="mono" data-testid="preview-invoice-number">
                {invoiceNumber}
              </span>{" "}
              <small className="muted">
                {copyType}
              </small>
            </h1>
            <div className="copy muted">
              Miejsce wystawienia:{" "}
              <b data-testid="preview-issue-place">{issuePlace}</b>
            </div>
            <div className="copy muted">
              Data wystawienia:{" "}
              <b data-testid="preview-issue-date">{issueDate}</b>
            </div>
            <div className="copy muted">
              Data zakończenia dostawy/usług:{" "}
              <b data-testid="preview-delivery-date">{deliveryDate}</b>
            </div>
          </section>
        </header>

        {/* Parties */}
        <section className="parties">
          <div className="card">
            <h3>Sprzedawca</h3>
            <p>
              <b data-testid="preview-seller-name-card">{seller.name}</b>
            </p>
            <p data-testid="preview-seller-address1-card">
              {seller.address_line_1}
              {seller.address_line_2 ? `, ${seller.address_line_2}` : ""}
            </p>
            <p>
              Tel.: <span data-testid="preview-seller-phone">{seller.phone}</span>
            </p>
            <p>
              NIP:{" "}
              <span className="mono" data-testid="preview-seller-nip-card">
                {seller.nip}
              </span>
            </p>
            <p>
              <span data-testid="preview-seller-bank">{seller.bank_name}</span>
            </p>
            <p>
              <span data-testid="preview-seller-bank-address">
                {seller.bank_branch_address}
              </span>
            </p>
            <p className="mono" data-testid="preview-seller-iban">
              {seller.iban}
            </p>
          </div>
          <div className="card">
            <h3>Nabywca</h3>
            <p>
              <b data-testid="preview-buyer-name">
                {data.buyer.name || "Nazwa nabywcy"}
              </b>
            </p>
            <p>
              NIP:{" "}
              <span className="mono" data-testid="preview-buyer-nip">
                {data.buyer.nip || "000-000-00-00"}
              </span>
            </p>
            <p data-testid="preview-buyer-address1">
              {data.buyer.address_line_1 || "Adres nabywcy"}
            </p>
            <p data-testid="preview-buyer-address2">
              {data.buyer.address_line_2 || "Kod, Miasto"}
            </p>
          </div>
        </section>

        {/* Items */}
        <section>
          <table className="items">
            <thead>
              <tr>
                <th style={{ width: "28px" }}>Lp</th>
                <th style={{ width: "22%" }}>Nazwa</th>
                <th style={{ width: "11%" }}>Kod</th>
                <th style={{ width: "9%" }}>KJC</th>
                <th style={{ width: "7%" }} className="center">
                  Ilość
                </th>
                <th style={{ width: "7%" }} className="center">
                  j.m.
                </th>
                <th style={{ width: "11%" }} className="num">
                  Cena jednostkowa
                  <br />
                  <small>netto</small>
                </th>
                <th style={{ width: "6%" }} className="center">
                  VAT
                  <br />
                  <small>%</small>
                </th>
                <th style={{ width: "11%" }} className="num">
                  Wartość
                  <br />
                  <small>netto</small>
                </th>
                <th style={{ width: "11%" }} className="num">
                  Kwota
                  <br />
                  <small>VAT</small>
                </th>
                <th style={{ width: "11%" }} className="num">
                  Wartość
                  <br />
                  <small>brutto</small>
                </th>
              </tr>
            </thead>
            <tbody data-testid="preview-items">
              {data.calculatedItems.length > 0 ? (
                data.calculatedItems.map((item, index) => (
                  <tr key={index} data-testid={`preview-item-${index}`}>
                    <td className="center">{index + 1}</td>
                    <td>{item.name || ""}</td>
                    <td className="mono">{item.code || ""}</td>
                    <td className="mono">{item.kjc || ""}</td>
                    <td className="center">{item.qty || ""}</td>
                    <td className="center">{item.uom || ""}</td>
                    <td className="num">{formatCurrency(item.unit_net)}</td>
                    <td className="center">{item.vat_rate || ""}</td>
                    <td className="num">{formatCurrency(item.net)}</td>
                    <td className="num">{formatCurrency(item.vat)}</td>
                    <td className="num">{formatCurrency(item.gross)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="center">1</td>
                  <td>Przykładowa usługa</td>
                  <td className="mono">SRV001</td>
                  <td className="mono">O</td>
                  <td className="center">1</td>
                  <td className="center">szt</td>
                  <td className="num">100,00</td>
                  <td className="center">23</td>
                  <td className="num">100,00</td>
                  <td className="num">23,00</td>
                  <td className="num">123,00</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals & VAT summary */}
        <section className="totals-wrap">
          <aside>
            <table className="vat-summary">
              <thead>
                <tr>
                  <th>według stawki VAT</th>
                  <th className="num">wartość netto</th>
                  <th className="num">kwota VAT</th>
                  <th className="num">wartość brutto</th>
                </tr>
              </thead>
              <tbody data-testid="preview-vat-summary">
                {data.vatSummary.length > 0 ? (
                  <>
                    {data.vatSummary.map((row, index) => (
                      <tr key={index} data-testid={`preview-vat-row-${index}`}>
                        <td>Podstawowy podatek VAT {row.rate}%</td>
                        <td className="num">{formatCurrency(row.net)}</td>
                        <td className="num">{formatCurrency(row.vat)}</td>
                        <td className="num">{formatCurrency(row.gross)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td>
                        <b>Razem:</b>
                      </td>
                      <td className="num">
                        <b data-testid="preview-total-net">
                          {formatCurrency(data.totals.net)}
                        </b>
                      </td>
                      <td className="num">
                        <b data-testid="preview-total-vat">
                          {formatCurrency(data.totals.vat)}
                        </b>
                      </td>
                      <td className="num">
                        <b data-testid="preview-total-gross">
                          {formatCurrency(data.totals.gross)}
                        </b>
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td>Podstawowy podatek VAT 23%</td>
                      <td className="num">100,00</td>
                      <td className="num">23,00</td>
                      <td className="num">123,00</td>
                    </tr>
                    <tr>
                      <td>
                        <b>Razem:</b>
                      </td>
                      <td className="num">
                        <b>100,00</b>
                      </td>
                      <td className="num">
                        <b>23,00</b>
                      </td>
                      <td className="num">
                        <b>123,00</b>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
            <div className="grand" style={{ marginTop: "10px" }}>
              <div className="row">
                <div className="label">Razem do zapłaty</div>
                <div className="value mono" data-testid="preview-total-due">
                  {formatCurrency(data.totals.gross)} PLN
                </div>
              </div>
              <div className="row">
                <div className="label">Słownie</div>
                <div data-testid="preview-amount-words">
                  {numberToWords(data.totals.gross)}
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* Notes & meta */}
        <section className="notes">
          <div className="note">
            <div>
              <b>Pozostało do zapłaty:</b>{" "}
              <span className="mono" data-testid="preview-balance-due">
                {formatCurrency(data.totals.gross)} PLN
              </span>
            </div>
            <div>
              <b>W terminie:</b>{" "}
              <span data-testid="preview-payment-terms">
                {data.payment_terms || "2024-01-15"}
              </span>{" "}
              <small className="muted">
                (<span data-testid="preview-payment-type">
                  {data.payment_type || "przelew"}
                </span>)
              </small>
            </div>
            <div className="muted">
              Uwagi do dokumentu:{" "}
              <span data-testid="preview-document-notes">
                {data.document_notes || "Brak uwag"}
              </span>
            </div>
          </div>
          <div className="note">
            <div>
              Dotyczy szkody:{" "}
              <span className="mono" data-testid="preview-claim-number">
                {data.claim_number || "2024/12/001"}
              </span>
            </div>
            <div>
              Pojazd:{" "}
              <span className="mono" data-testid="preview-vehicle">
                {data.vehicle || "BMW X5 WX12345"}
              </span>
            </div>
          </div>
        </section>

        {/* Signatures */}
        <section className="signatures">
          <div className="sig-box">
            Podpis osoby upoważnionej do odbioru faktury VAT
          </div>
          <div className="sig-box">
            Podpis osoby upoważnionej do wystawienia faktury VAT
          </div>
        </section>
      </div>
    </div>
  );
}
