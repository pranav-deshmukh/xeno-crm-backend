import { Request, Response } from "express";
import Order from "../models/Order";
import Customer from "../models/Customer";
import { z, ZodError } from "zod";

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

export const createOrder = async (req: Request, res: Response) => {
  try {
    const validatedData = OrderSchema.parse(req.body);

    if (!validatedData.status) validatedData.status = "pending";

    const order = new Order(validatedData);
    await order.save();

    const customer = await Customer.findOne({
      customer_id: validatedData.customer_id,
    });
    if (customer) {
      customer.total_spent += validatedData.amount;
      customer.total_orders += 1;
      customer.last_order_date = validatedData.order_date;
      await customer.save();
    }

    res.status(201).json({ success: true, order });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
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