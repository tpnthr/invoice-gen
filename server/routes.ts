import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInvoiceSchema, automationInvoiceSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get single invoice
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // Create invoice
  app.post("/api/invoices", async (req, res) => {
    try {
      console.log('Received invoice data:', JSON.stringify(req.body, null, 2));
      const validatedData = insertInvoiceSchema.parse(req.body);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));
      const invoice = await storage.createInvoice(validatedData);
      console.log('Created invoice:', JSON.stringify(invoice, null, 2));
      res.status(201).json(invoice);
    } catch (error) {
      console.error('Error creating invoice:', error);
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create invoice", error: (error as Error).message });
    }
  });

  // Update invoice
  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, validatedData);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Delete invoice
  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });


  // === N8N AUTOMATION ENDPOINTS ===
  
  // Create invoice from automation (n8n webhook endpoint)
  app.post("/api/invoices/from-automation", async (req, res) => {
    try {
      // Check for automation secret - mandatory
      const expectedSecret = process.env.AUTOMATION_SECRET;
      if (!expectedSecret) {
        return res.status(503).json({ message: "Service unavailable - AUTOMATION_SECRET not configured" });
      }
      
      const secret = req.headers['x-automation-secret'];
      if (String(secret) !== String(expectedSecret)) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validatedData = automationInvoiceSchema.parse(req.body);
      const hostUrl = `${req.protocol}://${req.get('host')}`;
      const result = await storage.createInvoiceFromAutomation(validatedData, hostUrl);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Failed to create invoice from automation", 
        error: (error as Error).message 
      });
    }
  });

  // Mark invoice as completed (triggers webhook) - also secured
  app.post("/api/invoices/:id/complete", async (req, res) => {
    try {
      // Check for automation secret - mandatory
      const expectedSecret = process.env.AUTOMATION_SECRET;
      if (!expectedSecret) {
        return res.status(503).json({ message: "Service unavailable - AUTOMATION_SECRET not configured" });
      }
      
      const secret = req.headers['x-automation-secret'];
      if (String(secret) !== String(expectedSecret)) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const invoice = await storage.markInvoiceCompleted(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete invoice" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
