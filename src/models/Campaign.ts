import mongoose, { Schema, Document } from "mongoose";

export interface ICampaign extends Document {
  campaign_id: string;
  name: string;
  segment_id: string;
  message_template: string;
  status: "DRAFT" | "RUNNING" | "COMPLETED" | "FAILED";
  total_audience: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const CampaignSchema: Schema = new Schema(
  {
    campaign_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    segment_id: { type: String, required: true, ref: "Segment" },
    message_template: { type: String, required: true },
    status: { 
      type: String, 
      enum: ["DRAFT", "RUNNING", "COMPLETED", "FAILED"], 
      default: "DRAFT" 
    },
    total_audience: { type: Number, required: true, default: 0 },
    sent_count: { type: Number, default: 0 },
    failed_count: { type: Number, default: 0 },
    pending_count: { type: Number, default: 0 },
    started_at: { type: Date },
    completed_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model<ICampaign>("Campaign", CampaignSchema);