import { type Invoice, type InsertInvoice, invoices } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { calculateInvoiceTotals } from "./invoice-calculations";

export interface IStorage {
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  getAllInvoices(): Promise<Invoice[]>;
}

export class DatabaseStorage implements IStorage {
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    // Calculate totals before storing
    const calculated = calculateInvoiceTotals(insertInvoice);
    
    const invoiceToInsert = {
      ...insertInvoice,
      copy_type: insertInvoice.copy_type || "ORYGINAŁ",
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

    // Calculate totals for updated data
    const updatedInvoice = { 
      ...existing, 
      ...updateData,
      copy_type: updateData.copy_type || existing.copy_type || "ORYGINAŁ"
    };
    const calculated = calculateInvoiceTotals(updatedInvoice as any);
    
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
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }
}

export const storage = new DatabaseStorage();
