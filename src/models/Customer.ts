import mongoose, {Schema, Document} from "mongoose";

export interface ICustomer extends Document {
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  total_spent: number;
  total_orders: number;
  last_order_date?: Date;
  registration_date: Date;
  city?: string;
  created_at: Date;
  updated_at: Date;
}

const CustomerSchema: Schema = new Schema(
  {
    customer_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    total_spent: { type: Number, default: 0 },
    total_orders: { type: Number, default: 0 },
    last_order_date: { type: Date },
    registration_date: { type: Date, required: true },
    city: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model<ICustomer>("Customer", CustomerSchema);