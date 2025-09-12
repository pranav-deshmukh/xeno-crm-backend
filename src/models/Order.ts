import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  order_id: string;
  customer_id: string;
  amount: number;
  items: { sku: string; name: string; quantity: number; price: number }[];
  order_date: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const OrderSchema: Schema = new Schema(
  {
    order_id: { type: String, required: true, unique: true },
    customer_id: { type: String, required: true, ref: "Customer" },
    amount: { type: Number, required: true },
    items: [
      {
        sku: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    order_date: { type: Date, required: true },
    status: { type: String, default: "pending" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model<IOrder>("Order", OrderSchema);
