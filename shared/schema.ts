import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const invoiceItems = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  code: z.string().optional(),
  kjc: z.string().optional(),
  qty: z.number().min(0, "Ilość musi być większa od 0"),
  uom: z.string().min(1, "Jednostka miary jest wymagana"),
  unit_net: z.number().min(0, "Cena netto musi być większa od 0"),
  vat_rate: z.number().min(0).max(100, "Stawka VAT musi być między 0 a 100"),
  net: z.number().optional(),
  vat: z.number().optional(),
  gross: z.number().optional(),
});

export const invoiceParty = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  nip: z.string().min(1, "NIP jest wymagany"),
  address_line_1: z.string().min(1, "Adres jest wymagany"),
  address_line_2: z.string().min(1, "Adres jest wymagany"),
  phone: z.string().optional(),
  bank_name: z.string().optional(),
  bank_branch_address: z.string().optional(),
  iban: z.string().optional(),
});


export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoice_number: text("invoice_number").notNull(),
  issue_date: text("issue_date").notNull(),
  delivery_date: text("delivery_date").notNull(),
  issue_place: text("issue_place").notNull(),
  copy_type: text("copy_type").default("ORYGINAŁ"),
  seller: jsonb("seller").notNull(),
  buyer: jsonb("buyer").notNull(),
  items: jsonb("items").notNull(),
  payment_terms: text("payment_terms"),
  payment_type: text("payment_type").default("przelew"),
  document_notes: text("document_notes"),
  claim_number: text("claim_number"),
  vehicle: text("vehicle"),
  total_net: decimal("total_net", { precision: 10, scale: 2 }),
  total_vat: decimal("total_vat", { precision: 10, scale: 2 }),
  total_gross: decimal("total_gross", { precision: 10, scale: 2 }),
  template_id: varchar("template_id"),
  webhook_url: text("webhook_url"),
  status: text("status").default("draft"),
  webhook_completed: boolean("webhook_completed").default(false),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});


export const insertInvoiceSchema = createInsertSchema(invoices, {
  seller: invoiceParty,
  buyer: invoiceParty,
  items: z.array(invoiceItems).min(1, "Przynajmniej jedna pozycja jest wymagana"),
}).omit({
  id: true,
  created_at: true,
});

export const invoiceFormSchema = z.object({
  invoice_number: z.string().min(1, "Numer faktury jest wymagany"),
  issue_date: z.string().min(1, "Data wystawienia jest wymagana"),
  delivery_date: z.string().min(1, "Data dostawy jest wymagana"),
  issue_place: z.string().min(1, "Miejsce wystawienia jest wymagane"),
  copy_type: z.string().default("ORYGINAŁ"),
  seller: invoiceParty,
  buyer: invoiceParty,
  items: z.array(invoiceItems).min(1, "Przynajmniej jedna pozycja jest wymagana"),
  payment_terms: z.string().optional(),
  payment_type: z.string().default("przelew"),
  document_notes: z.string().optional(),
  claim_number: z.string().optional(),
  vehicle: z.string().optional(),
});

// Schema for n8n automation requests
export const automationInvoiceSchema = z.object({
  invoice_number: z.string().optional(),
  template_id: z.string().optional(), // Deprecated but kept for compatibility
  webhook_url: z.string().url().optional(),
  seller: invoiceParty.partial().optional(), // Optional seller data from n8n
  buyer: invoiceParty.partial(),
  items: z.array(invoiceItems.partial()).optional(),
  payment_terms: z.string().optional(),
  payment_type: z.string().optional(),
  document_notes: z.string().optional(),
  claim_number: z.string().optional(),
  vehicle: z.string().optional(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceForm = z.infer<typeof invoiceFormSchema>;
export type InvoiceItem = z.infer<typeof invoiceItems>;
export type InvoiceParty = z.infer<typeof invoiceParty>;
export type AutomationInvoiceRequest = z.infer<typeof automationInvoiceSchema>;
