import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, Edit, Trash2, FileText, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/invoice-calculations";
import { type Invoice } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function InvoiceList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: () => fetch('/api/invoices').then(res => res.json()) as Promise<Invoice[]>
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/invoices/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Faktura usunięta",
        description: "Faktura została pomyślnie usunięta.",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć faktury.",
        variant: "destructive",
      });
    }
  });

  const filteredInvoices = invoices?.filter(invoice => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      (typeof invoice.seller === 'object' && invoice.seller && 'name' in invoice.seller && 
       (invoice.seller as any).name?.toLowerCase().includes(searchLower)) ||
      (typeof invoice.buyer === 'object' && invoice.buyer && 'name' in invoice.buyer && 
       (invoice.buyer as any).name?.toLowerCase().includes(searchLower))
    );
  }) || [];

  const handleDelete = (id: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć tę fakturę?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (id: string) => {
    setLocation(`/edit/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-invoice-bg p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ładowanie faktur...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-invoice-bg p-6">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>
              Nie udało się załadować faktur. Spróbuj ponownie później.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-invoice-bg">
      {/* Header */}
      <header className="bg-card border-b border-invoice-line px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-invoice-fg" data-testid="page-title">
              Lista Faktur VAT
            </h1>
            <p className="text-sm text-invoice-muted">
              Zarządzaj swoimi fakturami VAT
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setLocation('/')}
              data-testid="button-new-invoice"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nowa faktura
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Search and Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Wyszukiwanie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Szukaj po numerze faktury, sprzedawcy lub nabywcy..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Faktury ({filteredInvoices.length})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchTerm ? "Brak wyników wyszukiwania" : "Brak faktur"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? "Spróbuj zmienić kryteria wyszukiwania"
                    : "Utwórz swoją pierwszą fakturę VAT"
                  }
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setLocation('/')}
                    data-testid="button-create-first"
                  >
                    Utwórz pierwszą fakturę
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numer faktury</TableHead>
                      <TableHead>Sprzedawca</TableHead>
                      <TableHead>Nabywca</TableHead>
                      <TableHead>Data wystawienia</TableHead>
                      <TableHead className="text-right">Kwota brutto</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-32">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody data-testid="invoice-list">
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                        <TableCell className="font-mono font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          {typeof invoice.seller === 'object' && invoice.seller && 'name' in invoice.seller
                            ? (invoice.seller as any).name
                            : 'Brak danych'}
                        </TableCell>
                        <TableCell>
                          {typeof invoice.buyer === 'object' && invoice.buyer && 'name' in invoice.buyer
                            ? (invoice.buyer as any).name
                            : 'Brak danych'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {invoice.issue_date}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(parseFloat(invoice.total_gross || "0"))} PLN
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Aktywna</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(invoice.id)}
                              data-testid={`button-edit-${invoice.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(invoice.id)}
                              data-testid={`button-delete-${invoice.id}`}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}