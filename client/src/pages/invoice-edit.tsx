import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { InvoiceForm } from "@/components/invoice-form";
import { InvoicePreview } from "@/components/invoice-preview";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, FileText, Download } from "lucide-react";
import { type InvoiceForm as InvoiceFormType } from "@shared/schema";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function InvoiceEdit() {
  const [, params] = useRoute("/edit/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const invoiceId = params?.id;

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
  });

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['/api/invoices', invoiceId],
    queryFn: () => fetch(`/api/invoices/${invoiceId}`).then(res => res.json()),
    enabled: !!invoiceId
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InvoiceFormType) => {
      return await apiRequest(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId] });
      toast({
        title: "Faktura zaktualizowana",
        description: "Zmiany zostały pomyślnie zapisane.",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać zmian.",
        variant: "destructive",
      });
    }
  });

  // Load invoice data when available
  useEffect(() => {
    if (invoice) {
      setInvoiceData({
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        delivery_date: invoice.delivery_date,
        issue_place: invoice.issue_place,
        copy_type: invoice.copy_type || "ORYGINAŁ",
        seller: typeof invoice.seller === 'object' ? invoice.seller : {
          name: "",
          nip: "",
          address_line_1: "",
          address_line_2: "",
        },
        buyer: typeof invoice.buyer === 'object' ? invoice.buyer : {
          name: "",
          nip: "",
          address_line_1: "",
          address_line_2: "",
        },
        items: Array.isArray(invoice.items) ? invoice.items.map((item: any) => ({
          ...item,
          kjc: item.kjc || item.cn_pkwiu || "", // Handle both old and new field names
          cn_pkwiu: undefined // Remove old field
        })) : [{
          name: "",
          code: "",
          kjc: "",
          qty: 0,
          uom: "",
          unit_net: 0,
          vat_rate: 23,
        }],
        payment_terms: invoice.payment_terms,
        payment_type: invoice.payment_type || "przelew",
        document_notes: invoice.document_notes,
        claim_number: invoice.claim_number,
        vehicle: invoice.vehicle,
      });
    }
  }, [invoice]);

  const handleSave = () => {
    updateMutation.mutate(invoiceData);
  };

  const handlePrint = () => {
    window.print();
  };

  const calculatedData = calculateInvoiceTotals(invoiceData);

  if (!invoiceId) {
    return (
      <div className="min-h-screen bg-invoice-bg p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Nieprawidłowy identyfikator faktury.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-invoice-bg">
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Ładowanie faktury...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-invoice-bg p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Nie udało się załadować faktury. Sprawdź czy faktura istnieje.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-invoice-bg">
      {/* Header */}
      <header className="no-print bg-card border-b border-invoice-line px-6 py-4">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/invoices')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Lista faktur
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-invoice-fg" data-testid="page-title">
                Edytuj Fakturę VAT
              </h1>
              <p className="text-sm text-invoice-muted">
                {invoiceData.invoice_number || "Nowa faktura"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              data-testid="button-save"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? "Zapisywanie..." : "Zapisz"}
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