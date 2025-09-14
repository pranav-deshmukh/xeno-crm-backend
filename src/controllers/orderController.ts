import { Request, Response } from "express";
import { z } from "zod";
import { MessageProducer } from "../services/producer";
import Order from "../models/Order";

const OrderSchema = z.object({
  order_id: z.string(),
  customer_id: z.string(),
  amount: z.number().nonnegative(),
  items: z.array(
    z.object({
      sku: z.string(),
      name: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().nonnegative(),
    })
  ),
  order_date: z.string().transform((val) => new Date(val)),
  status: z.string().optional(),
});

const producer = new MessageProducer();

export const createOrder = async (req: Request, res: Response) => {
  try {
    const validatedData = OrderSchema.parse(req.body);
    if (!validatedData.status) validatedData.status = "pending";
    
    const messageId = await producer.publishOrder(validatedData);
    
    res.status(202).json({ 
      success: true, 
      message: "Order creation request accepted",
      messageId 
    });
  } catch (error: unknown) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Validation failed'
    });
  }
};


export const getOrders = async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find();
    res.json({ success: true, orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};