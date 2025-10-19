import { 
  type Invoice, 
  type InsertInvoice, 
  type AutomationInvoiceRequest,
  invoices
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { calculateInvoiceTotals } from "./invoice-calculations";

export interface IStorage {
  // Invoice operations
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  getAllInvoices(): Promise<Invoice[]>;
  
  // Automation operations
  createInvoiceFromAutomation(data: AutomationInvoiceRequest, hostUrl: string): Promise<{ invoice: Invoice, edit_url: string }>;
  markInvoiceCompleted(id: string): Promise<Invoice | undefined>;
  sendWebhook(invoice: Invoice): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    // Calculate totals before storing - only pass calculation-relevant fields
    const calculationData = {
      seller: insertInvoice.seller,
      buyer: insertInvoice.buyer,
      items: insertInvoice.items,
      payment_type: insertInvoice.payment_type || "przelew",
      invoice_number: insertInvoice.invoice_number,
      issue_date: insertInvoice.issue_date,
      delivery_date: insertInvoice.delivery_date,
      issue_place: insertInvoice.issue_place,
      copy_type: insertInvoice.copy_type || "ORYGINAŁ",
      payment_terms: insertInvoice.payment_terms || undefined,
      document_notes: insertInvoice.document_notes || undefined,
      claim_number: insertInvoice.claim_number || undefined,
      vehicle: insertInvoice.vehicle || undefined,
    };
    const calculated = calculateInvoiceTotals(calculationData);
    
    const invoiceToInsert = {
      ...insertInvoice,
      copy_type: insertInvoice.copy_type || "ORYGINAŁ",
      payment_type: insertInvoice.payment_type || "przelew",
      status: insertInvoice.status || "draft",
      webhook_completed: false,
      total_net: calculated.totals.net.toFixed(2),
      total_vat: calculated.totals.vat.toFixed(2),
      total_gross: calculated.totals.gross.toFixed(2),
    };

    const [invoice] = await db
      .insert(invoices)
      .values(invoiceToInsert)
      .returning();
    return invoice;
  }

  async updateInvoice(id: string, updateData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existing = await this.getInvoice(id);
    if (!existing) return undefined;

    // Calculate totals for updated data - only pass calculation-relevant fields
    const mergedInvoice = { ...existing, ...updateData };
    const calculationData = {
      seller: mergedInvoice.seller as any,
      buyer: mergedInvoice.buyer as any,
      items: mergedInvoice.items as any,
      payment_type: mergedInvoice.payment_type || "przelew",
      invoice_number: mergedInvoice.invoice_number,
      issue_date: mergedInvoice.issue_date,
      delivery_date: mergedInvoice.delivery_date,
      issue_place: mergedInvoice.issue_place,
      copy_type: mergedInvoice.copy_type || "ORYGINAŁ",
      payment_terms: mergedInvoice.payment_terms || undefined,
      document_notes: mergedInvoice.document_notes || undefined,
      claim_number: mergedInvoice.claim_number || undefined,
      vehicle: mergedInvoice.vehicle || undefined,
    };
    const calculated = calculateInvoiceTotals(calculationData);
    
    const dataToUpdate = {
      ...updateData,
      total_net: calculated.totals.net.toFixed(2),
      total_vat: calculated.totals.vat.toFixed(2),
      total_gross: calculated.totals.gross.toFixed(2),
    };

    const [updated] = await db
      .update(invoices)
      .set(dataToUpdate)
      .where(eq(invoices.id, id))
      .returning();
    
    // Check if invoice was marked as completed and send webhook if needed
    if (updated && updateData.status === "completed" && updated.webhook_url && !updated.webhook_completed) {
      const webhookSuccess = await this.sendWebhook(updated);
      await db.update(invoices)
        .set({ webhook_completed: webhookSuccess })
        .where(eq(invoices.id, id));
    }
    
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }

  // Automation operations
  async createInvoiceFromAutomation(data: AutomationInvoiceRequest, hostUrl: string): Promise<{ invoice: Invoice, edit_url: string }> {
    // Validate webhook URL if provided (simple domain allowlist)
    if (data.webhook_url) {
      const allowedDomains = process.env.WEBHOOK_ALLOWED_DOMAINS?.split(',') || ['localhost', '127.0.0.1'];
      const url = new URL(data.webhook_url);
      const isAllowed = allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain));
      if (!isAllowed) {
        throw new Error('Webhook URL domain not allowed');
      }
    }

    // Use environment-based or provided seller data
    const defaultSeller = {
      name: process.env.DEFAULT_SELLER_NAME || "Nazwa firmy",
      nip: process.env.DEFAULT_SELLER_NIP || "000-000-00-00",
      address_line_1: process.env.DEFAULT_SELLER_ADDRESS_1 || "Adres firmy",
      address_line_2: process.env.DEFAULT_SELLER_ADDRESS_2 || "Kod, Miasto",
      phone: process.env.DEFAULT_SELLER_PHONE || "+48 000 000 000",
      bank_name: process.env.DEFAULT_SELLER_BANK || "Bank",
      bank_branch_address: process.env.DEFAULT_SELLER_BANK_ADDRESS || "Adres banku",
      iban: process.env.DEFAULT_SELLER_IBAN || "PL00 0000 0000 0000 0000 0000 0000",
    };

    // Merge provided seller data with defaults
    const seller = {
      name: data.seller?.name || defaultSeller.name,
      nip: data.seller?.nip || defaultSeller.nip,
      address_line_1: data.seller?.address_line_1 || defaultSeller.address_line_1,
      address_line_2: data.seller?.address_line_2 || defaultSeller.address_line_2,
      phone: data.seller?.phone || defaultSeller.phone,
      bank_name: data.seller?.bank_name || defaultSeller.bank_name,
      bank_branch_address: data.seller?.bank_branch_address || defaultSeller.bank_branch_address,
      iban: data.seller?.iban || defaultSeller.iban,
    };

    // Use provided items or fallback to default
    let items;
    if (data.items && data.items.length > 0) {
      items = data.items.map(item => ({
        name: item.name || "Usługa",
        code: item.code,
        qty: item.qty || 1,
        uom: item.uom || "szt",
        unit_net: item.unit_net || 0,
        vat_rate: item.vat_rate || 23,
      }));
    } else {
      // Fallback to default item
      items = [{
        name: "Usługa",
        code: "",
        qty: 1,
        uom: "szt",
        unit_net: 0,
        vat_rate: 23,
      }];
    }

    // Generate unique invoice number if not provided
    const providedInvoiceNumber = typeof data.invoice_number === 'string' ? data.invoice_number.trim() : '';
    const invoiceNumber = providedInvoiceNumber.length > 0
      ? providedInvoiceNumber
      : `AUTO/${new Date().getFullYear()}/${Date.now()}`;

    const invoiceData: InsertInvoice = {
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString().split('T')[0],
      delivery_date: new Date().toISOString().split('T')[0],
      issue_place: "Warszawa",
      copy_type: "ORYGINAŁ",
      seller: seller,
      buyer: {
        name: data.buyer?.name || "Nabywca",
        nip: data.buyer?.nip || "000-000-00-00",
        address_line_1: data.buyer?.address_line_1 || "Adres nabywcy",
        address_line_2: data.buyer?.address_line_2 || "Kod, Miasto",
        phone: data.buyer?.phone,
        bank_name: data.buyer?.bank_name,
        bank_branch_address: data.buyer?.bank_branch_address,
        iban: data.buyer?.iban,
      },
      items: items,
      payment_terms: data.payment_terms,
      payment_type: data.payment_type || "przelew",
      document_notes: data.document_notes,
      claim_number: data.claim_number,
      vehicle: data.vehicle,
      template_id: data.template_id,
      webhook_url: data.webhook_url,
      status: "draft",
      webhook_completed: false,
    };

    const invoice = await this.createInvoice(invoiceData);
    const editUrl = `${hostUrl}/edit/${invoice.id}`;
    
    return { invoice, edit_url: editUrl };
  }

  async sendWebhook(invoice: Invoice): Promise<boolean> {
    if (!invoice.webhook_url) return false;

    try {
      const webhookPayload = {
        event: "invoice_completed",
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_gross: invoice.total_gross,
        buyer: invoice.buyer,
        items: invoice.items,
        completed_at: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(webhookPayload);
      
      // Sign the webhook payload
      const secret = process.env.WEBHOOK_SECRET;
      if (!secret) {
        console.error('WEBHOOK_SECRET not configured - cannot send signed webhook');
        return false;
      }
      
      const crypto = await import('crypto');
      const signature = crypto.createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      const response = await fetch(invoice.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
        },
        body: payloadString,
      });

      return response.ok;
    } catch (error) {
      console.error('Webhook failed:', error);
      return false;
    }
  }

  async markInvoiceCompleted(id: string): Promise<Invoice | undefined> {
    const existing = await this.getInvoice(id);
    if (!existing) return undefined;

    // Update status and send webhook if needed
    const updated = await this.updateInvoice(id, { status: "completed" });
    if (!updated) return undefined;

    // Return refreshed invoice to ensure webhook_completed is accurate
    return await this.getInvoice(id);
  }
}

export const storage = new DatabaseStorage();
