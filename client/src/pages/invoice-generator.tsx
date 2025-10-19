import { useState } from "react";
import { InvoiceForm } from "@/components/invoice-form";
import { InvoicePreview } from "@/components/invoice-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, CheckCircle, List, Save, Scan, UploadCloud } from "lucide-react";
import { type InvoiceForm as InvoiceFormType } from "@shared/schema";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { convertAudatexToInvoice } from "@/lib/audatex-parser";

export default function InvoiceGenerator() {
  const [, setLocation] = useLocation();
  const [invoiceData, setInvoiceData] = useState<InvoiceFormType>({
    invoice_number: "",
    issue_date: new Date().toISOString().split('T')[0],
    delivery_date: new Date().toISOString().split('T')[0],
    issue_place: "",
    copy_type: "ORYGINAŁ",
    seller: {
      name: "",
      nip: "",
      address_line_1: "",
      address_line_2: "",
      phone: "",
      bank_name: "",
      bank_branch_address: "",
      iban: "",
    },
    buyer: {
      name: "",
      nip: "",
      address_line_1: "",
      address_line_2: "",
    },
    items: [{
      name: "",
      code: "",
      kjc: "",
      qty: 0,
      uom: "",
      unit_net: 0,
      vat_rate: 23,
    }],
    payment_terms: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_type: "przelew",
    document_notes: "",
    claim_number: "",
    vehicle: "",
  });

  const { toast } = useToast();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceFormType) => {
      return await apiRequest('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Faktura zapisana",
        description: `Faktura ${invoice.invoice_number} została pomyślnie utworzona.`,
      });
      // Optionally redirect to edit page
      setLocation(`/edit/${invoice.id}`);
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać faktury.",
        variant: "destructive",
      });
    }
  });

  const handleLoadSampleData = () => {
    const sampleData: InvoiceFormType = {
      invoice_number: "FV/2024/001",
      issue_date: "2024-01-15",
      delivery_date: "2024-01-15",
      issue_place: "Warszawa",
      copy_type: "ORYGINAŁ",
      seller: {
        name: "ABC Serwis Sp. z o.o.",
        nip: "123-456-78-90",
        address_line_1: "ul. Warsztatowa 123",
        address_line_2: "00-001 Warszawa",
        phone: "+48 22 123 45 67",
        bank_name: "PKO Bank Polski",
        bank_branch_address: "Warszawa, ul. Puławska 15",
        iban: "PL12 1020 1097 0000 1234 5678 9012",
      },
      buyer: {
        name: "XYZ Transport Sp. z o.o.",
        nip: "098-765-43-21",
        address_line_1: "ul. Transportowa 456",
        address_line_2: "00-002 Kraków",
      },
      items: [
        {
          name: "Naprawa układu hamulcowego",
          code: "SRV001",
          kjc: "O",
          qty: 1,
          uom: "usł",
          unit_net: 850.00,
          vat_rate: 23,
        },
        {
          name: "Wymiana oleju silnikowego",
          code: "SRV002",
          kjc: "Q",
          qty: 1,
          uom: "usł",
          unit_net: 120.00,
          vat_rate: 23,
        },
      ],
      payment_terms: "2024-01-30",
      payment_type: "przelew",
      document_notes: "Płatność w terminie 14 dni od daty wystawienia faktury.",
      claim_number: "2024/SK/001234",
      vehicle: "BMW X5 3.0d WX12345",
    };

    setInvoiceData(sampleData);
    toast({
      title: "Przykładowe dane załadowane",
      description: "Formularz został wypełniony przykładowymi danymi.",
    });
  };

  const handleValidateInvoice = () => {
    const errors = [];
    
    if (!invoiceData.invoice_number) errors.push("Numer faktury jest wymagany");
    if (!invoiceData.seller.name) errors.push("Nazwa sprzedawcy jest wymagana");
    if (!invoiceData.buyer.name) errors.push("Nazwa nabywcy jest wymagana");
    if (invoiceData.items.length === 0 || !invoiceData.items[0].name) {
      errors.push("Przynajmniej jedna pozycja jest wymagana");
    }

    if (errors.length === 0) {
      toast({
        title: "Faktura jest poprawna",
        description: "Wszystkie wymagane pola zostały wypełnione.",
      });
    } else {
      toast({
        title: "Błędy walidacji",
        description: errors.join(", "),
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    createMutation.mutate(invoiceData);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleImportAudatex = () => {
    if (!importJson.trim()) {
      toast({
        title: "Brak danych",
        description: "Wklej odpowiedź JSON przed importem.",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsed = JSON.parse(importJson);
      const updated = convertAudatexToInvoice(parsed, invoiceData);
      setInvoiceData(updated);
      setImportDialogOpen(false);
      setImportJson("");
      toast({
        title: "Import zakończony",
        description: "Pozycje z kalkulacji zostały dodane do faktury.",
      });
    } catch (error) {
      console.error("Błąd importu Audatex", error);
      const message = error instanceof Error ? error.message : "Nie udało się przetworzyć danych";
      toast({
        title: "Błąd importu",
        description: message,
        variant: "destructive",
      });
    }
  };

  const calculatedData = calculateInvoiceTotals(invoiceData);

  return (
    <div className="min-h-screen bg-invoice-bg">
      {/* Header */}
      <header className="no-print bg-card border-b border-invoice-line px-6 py-4">
        <div className="flex items-center justify-between max-w-full">
          <div>
            <h1 className="text-2xl font-bold text-invoice-fg" data-testid="page-title">
              Generator Faktury VAT
            </h1>
            <p className="text-sm text-invoice-muted">
              Tworzenie i podgląd faktur VAT w czasie rzeczywistym
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/invoices')}
              data-testid="button-invoice-list"
              className="flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              Lista faktur
            </Button>
            <Button
              variant="outline"
              onClick={handleLoadSampleData}
              data-testid="button-load-sample"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Przykładowe dane
            </Button>
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  data-testid="button-import-audatex"
                  className="flex items-center gap-2"
                >
                  <UploadCloud className="h-4 w-4" />
                  Import JSON
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Import z kalkulacji Audatex</DialogTitle>
                  <DialogDescription>
                    Wklej pełną odpowiedź JSON z API Audatex, aby utworzyć edytowalny szkic faktury.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={importJson}
                  onChange={(event) => setImportJson(event.target.value)}
                  className="font-mono text-sm min-h-[260px]"
                  placeholder="Wklej tutaj dane JSON"
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setImportDialogOpen(false)}
                  >
                    Anuluj
                  </Button>
                  <Button type="button" onClick={handleImportAudatex}>
                    Importuj
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              asChild
              data-testid="button-scan"
              className="flex items-center gap-2"
            >
              <a
                href="https://n8n.xaia.cloud/form/efbd6b06-c3ac-4a72-aeb4-c58d64733c0a"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Scan className="h-4 w-4" />
                SCAN
              </a>
            </Button>
            <Button
              variant="secondary"
              onClick={handleValidateInvoice}
              data-testid="button-validate"
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Walidacja
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleSave}
              disabled={createMutation.isPending}
              data-testid="button-save"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {createMutation.isPending ? "Zapisywanie..." : "Zapisz"}
            </Button>
            <Button 
              onClick={handlePrint}
              data-testid="button-print"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Drukuj
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">
        {/* Form Panel */}
        <div className="no-print w-full lg:w-1/2 p-6 bg-invoice-muted/30 overflow-y-auto">
          <div className="max-w-md mx-auto">
            <InvoiceForm 
              data={invoiceData} 
              onChange={setInvoiceData}
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-full lg:w-1/2 bg-gray-50 overflow-y-auto">
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm">
              <InvoicePreview data={calculatedData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
