import { Request, Response } from "express";
import { z } from "zod";
import { MessageProducer } from "../services/producer";
import Customer from "../models/Customer";

const CustomerSchema = z.object({
  customer_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  registration_date: z.string().transform((val) => new Date(val)),
  city: z.string().optional(),
  total_spent: z.number(),
  total_orders: z.number(),
  last_order_date: z.string().transform((val) => new Date(val)).optional(),
});

const producer = new MessageProducer();

export const createCustomer = async (req: Request, res: Response) => {
  try {
    // Only validate data, don't persist yet
    const validatedData = CustomerSchema.parse(req.body);
    
    // Publish to Redis Stream
    const messageId = await producer.publishCustomer(validatedData);
    
    res.status(202).json({ 
      success: true, 
      message: "Customer creation request accepted",
      messageId 
    });
  } catch (error: unknown) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Validation failed'
    });
  }
};

export const getCustomers = async (_req: Request, res: Response) => {
  try {
    const customers = await Customer.find();
    res.json({ success: true, customers });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};