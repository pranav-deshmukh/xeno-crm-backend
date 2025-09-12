import { Request, Response } from "express";
import Customer from "../models/Customer";
import { z, ZodError } from "zod";

const CustomerSchema = z.object({
  customer_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  registration_date: z.string().transform((val) => new Date(val)),
  city: z.string().optional(),
});

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const validatedData = CustomerSchema.parse(req.body);

    const existing = await Customer.findOne({
      customer_id: validatedData.customer_id,
    });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Customer already exists" });
    }

    const customer = new Customer(validatedData);
    await customer.save();

    res.status(201).json({ success: true, customer });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
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