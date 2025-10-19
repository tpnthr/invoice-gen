import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Receipt, Building, User, Package, CreditCard, Info, FileText } from "lucide-react";
import { type InvoiceForm as InvoiceFormType } from "@shared/schema";

interface InvoiceFormProps {
  data: InvoiceFormType;
  onChange: (data: InvoiceFormType) => void;
}

export function InvoiceForm({ data, onChange }: InvoiceFormProps) {

  const toNumber = (value: any, defaultValue: number): number => {
    // Treat null, undefined, and empty/whitespace strings as invalid
    if (value == null) return defaultValue;
    if (typeof value === 'string' && value.trim() === '') return defaultValue;
    
    const num = Number(value);
    return Number.isFinite(num) ? num : defaultValue;
  };


  const updateField = (field: string, value: any) => {
    const keys = field.split('.');
    const newData = { ...data };
    let current: any = newData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key.includes('[')) {
        const [arrayName, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        current = current[arrayName][index];
      } else {
        current = current[key];
      }
    }
    
    const finalKey = keys[keys.length - 1];
    if (finalKey.includes('[')) {
      const [arrayName, indexStr] = finalKey.split('[');
      const index = parseInt(indexStr.replace(']', ''));
      current[arrayName][index] = value;
    } else {
      current[finalKey] = value;
    }
    
    onChange(newData);
  };

  const addItem = () => {
    const newData = { ...data };
    newData.items.push({
      name: "",
      code: "",
      qty: 0,
      uom: "",
      unit_net: 0,
      vat_rate: 23,
    });
    onChange(newData);
  };

  const removeItem = (index: number) => {
    if (data.items.length > 1) {
      const newData = { ...data };
      newData.items.splice(index, 1);
      onChange(newData);
    }
  };

  return (
    <div className="space-y-6">

      {/* Invoice Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Dane faktury
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="invoice_number">Numer faktury</Label>
              <Input
                id="invoice_number"
                value={data.invoice_number}
                onChange={(e) => updateField('invoice_number', e.target.value)}
                placeholder="FV/2024/001"
                className="font-mono"
                data-testid="input-invoice-number"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="issue_date">Data wystawienia</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={data.issue_date}
                  onChange={(e) => updateField('issue_date', e.target.value)}
                  data-testid="input-issue-date"
                />
              </div>
              <div>
                <Label htmlFor="delivery_date">Data dostawy</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={data.delivery_date}
                  onChange={(e) => updateField('delivery_date', e.target.value)}
                  data-testid="input-delivery-date"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="issue_place">Miejsce wystawienia</Label>
              <Input
                id="issue_place"
                value={data.issue_place}
                onChange={(e) => updateField('issue_place', e.target.value)}
                placeholder="Warszawa"
                data-testid="input-issue-place"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seller Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Sprzedawca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="seller_name">Nazwa firmy</Label>
            <Input
              id="seller_name"
              value={data.seller.name}
              onChange={(e) => updateField('seller.name', e.target.value)}
              placeholder="ABC Sp. z o.o."
              data-testid="input-seller-name"
            />
          </div>
          <div>
            <Label htmlFor="seller_nip">NIP</Label>
            <Input
              id="seller_nip"
              value={data.seller.nip}
              onChange={(e) => updateField('seller.nip', e.target.value)}
              placeholder="123-456-78-90"
              className="font-mono"
              data-testid="input-seller-nip"
            />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="seller_address1">Adres - linia 1</Label>
              <Input
                id="seller_address1"
                value={data.seller.address_line_1}
                onChange={(e) => updateField('seller.address_line_1', e.target.value)}
                placeholder="ul. Przykładowa 123"
                data-testid="input-seller-address1"
              />
            </div>
            <div>
              <Label htmlFor="seller_address2">Adres - linia 2</Label>
              <Input
                id="seller_address2"
                value={data.seller.address_line_2}
                onChange={(e) => updateField('seller.address_line_2', e.target.value)}
                placeholder="00-001 Warszawa"
                data-testid="input-seller-address2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="seller_phone">Telefon</Label>
              <Input
                id="seller_phone"
                value={data.seller.phone || ""}
                onChange={(e) => updateField('seller.phone', e.target.value)}
                placeholder="+48 123 456 789"
                data-testid="input-seller-phone"
              />
            </div>
            <div>
              <Label htmlFor="seller_bank">Bank</Label>
              <Input
                id="seller_bank"
                value={data.seller.bank_name || ""}
                onChange={(e) => updateField('seller.bank_name', e.target.value)}
                placeholder="PKO BP"
                data-testid="input-seller-bank"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="seller_bank_address">Adres banku</Label>
            <Input
              id="seller_bank_address"
              value={data.seller.bank_branch_address || ""}
              onChange={(e) => updateField('seller.bank_branch_address', e.target.value)}
              placeholder="Warszawa, ul. Bankowa 1"
              data-testid="input-seller-bank-address"
            />
          </div>
          <div>
            <Label htmlFor="seller_iban">IBAN</Label>
            <Input
              id="seller_iban"
              value={data.seller.iban || ""}
              onChange={(e) => updateField('seller.iban', e.target.value)}
              placeholder="PL12 3456 7890 1234 5678 9012 3456"
              className="font-mono"
              data-testid="input-seller-iban"
            />
          </div>
        </CardContent>
      </Card>

      {/* Buyer Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Nabywca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="buyer_name">Nazwa firmy/Imię i nazwisko</Label>
            <Input
              id="buyer_name"
              value={data.buyer.name}
              onChange={(e) => updateField('buyer.name', e.target.value)}
              placeholder="XYZ Sp. z o.o."
              data-testid="input-buyer-name"
            />
          </div>
          <div>
            <Label htmlFor="buyer_nip">NIP</Label>
            <Input
              id="buyer_nip"
              value={data.buyer.nip}
              onChange={(e) => updateField('buyer.nip', e.target.value)}
              placeholder="098-765-43-21"
              className="font-mono"
              data-testid="input-buyer-nip"
            />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="buyer_address1">Adres - linia 1</Label>
              <Input
                id="buyer_address1"
                value={data.buyer.address_line_1}
                onChange={(e) => updateField('buyer.address_line_1', e.target.value)}
                placeholder="ul. Testowa 456"
                data-testid="input-buyer-address1"
              />
            </div>
            <div>
              <Label htmlFor="buyer_address2">Adres - linia 2</Label>
              <Input
                id="buyer_address2"
                value={data.buyer.address_line_2}
                onChange={(e) => updateField('buyer.address_line_2', e.target.value)}
                placeholder="00-002 Warszawa"
                data-testid="input-buyer-address2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Pozycje
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addItem}
              data-testid="button-add-item"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Dodaj
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.items.map((item, index) => (
              <div key={index} className="bg-accent/30 p-4 rounded border border-border">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Pozycja #{index + 1}
                  </span>
                  {data.items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700"
                      data-testid={`button-remove-item-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Nazwa</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateField(`items[${index}].name`, e.target.value)}
                      placeholder="Usługa serwisowa"
                      data-testid={`input-item-name-${index}`}
                    />
                  </div>
                  <div>
                    <Label>Kod</Label>
                    <Input
                      value={item.code || ""}
                      onChange={(e) => updateField(`items[${index}].code`, e.target.value)}
                      placeholder="SRV001"
                      className="font-mono"
                      data-testid={`input-item-code-${index}`}
                    />
                  </div>
                  <div>
                    <Label>Ilość</Label>
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateField(`items[${index}].qty`, Number(e.target.value))}
                      placeholder="1"
                      step="0.01"
                      data-testid={`input-item-qty-${index}`}
                    />
                  </div>
                  <div>
                    <Label>J.m.</Label>
                    <Input
                      value={item.uom}
                      onChange={(e) => updateField(`items[${index}].uom`, e.target.value)}
                      placeholder="szt"
                      data-testid={`input-item-uom-${index}`}
                    />
                  </div>
                  <div>
                    <Label>Cena netto (PLN)</Label>
                    <Input
                      type="number"
                      value={item.unit_net}
                      onChange={(e) => updateField(`items[${index}].unit_net`, Number(e.target.value))}
                      placeholder="100.00"
                      step="0.01"
                      className="font-mono"
                      data-testid={`input-item-price-${index}`}
                    />
                  </div>
                  <div>
                    <Label>VAT (%)</Label>
                    <Select 
                      value={item.vat_rate.toString()} 
                      onValueChange={(value) => updateField(`items[${index}].vat_rate`, Number(value))}
                    >
                      <SelectTrigger data-testid={`select-item-vat-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="23">23%</SelectItem>
                        <SelectItem value="8">8%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="0">0%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Płatność
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="payment_terms">Termin płatności</Label>
            <Input
              id="payment_terms"
              type="date"
              value={data.payment_terms || ""}
              onChange={(e) => updateField('payment_terms', e.target.value)}
              data-testid="input-payment-terms"
            />
          </div>
          <div>
            <Label htmlFor="payment_type">Sposób płatności</Label>
            <Select 
              value={data.payment_type} 
              onValueChange={(value) => updateField('payment_type', value)}
            >
              <SelectTrigger data-testid="select-payment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="przelew">Przelew bankowy</SelectItem>
                <SelectItem value="gotowka">Gotówka</SelectItem>
                <SelectItem value="karta">Karta płatnicza</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="document_notes">Uwagi</Label>
            <Textarea
              id="document_notes"
              value={data.document_notes || ""}
              onChange={(e) => updateField('document_notes', e.target.value)}
              placeholder="Dodatkowe informacje..."
              rows={3}
              data-testid="input-document-notes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Dodatkowe informacje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="claim_number">Numer szkody</Label>
            <Input
              id="claim_number"
              value={data.claim_number || ""}
              onChange={(e) => updateField('claim_number', e.target.value)}
              placeholder="2024/12/001"
              className="font-mono"
              data-testid="input-claim-number"
            />
          </div>
          <div>
            <Label htmlFor="vehicle">Pojazd</Label>
            <Input
              id="vehicle"
              value={data.vehicle || ""}
              onChange={(e) => updateField('vehicle', e.target.value)}
              placeholder="BMW X5 WX12345"
              data-testid="input-vehicle"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
