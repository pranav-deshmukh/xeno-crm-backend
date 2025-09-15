import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICommunicationLog extends Document {
  _id: Types.ObjectId;
  campaign_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED";
  delivery_timestamp?: Date;
  failure_reason?: string;
  vendor_message_id?: string;
  created_at: Date;
  updated_at: Date;
}

const CommunicationLogSchema: Schema = new Schema(
  {
    campaign_id: { type: String, required: true, ref: "Campaign" },
    customer_id: { type: String, required: true, ref: "Customer" },
    customer_name: { type: String, required: true },
    customer_email: { type: String, required: true },
    message: { type: String, required: true },
    status: { 
      type: String, 
      enum: ["PENDING", "SENT", "FAILED"], 
      default: "PENDING" 
    },
    delivery_timestamp: { type: Date },
    failure_reason: { type: String },
    vendor_message_id: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

CommunicationLogSchema.index({ campaign_id: 1, status: 1 });
CommunicationLogSchema.index({ customer_id: 1, created_at: -1 });

export default mongoose.model<ICommunicationLog>("CommunicationLog", CommunicationLogSchema);