import mongoose, { Schema, Document } from "mongoose";
import { Rule } from "../utils/buildMongoQuery";

export interface ISegment extends Document {
  segment_id: string;
  name: string;
  description?: string;
  rules: Rule[];
  audience_size: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

const SegmentSchema: Schema = new Schema(
  {
    segment_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    rules: [
      {
        id: { type: String, required: true },
        field: { 
          type: String, 
          required: true,
          enum: ["total_spent", "last_order_date", "total_orders", "city", "registration_date"]
        },
        operator: { 
          type: String, 
          required: true,
          enum: [">", "<", ">=", "<=", "=", "!=", "contains", "not_contains", "older_than"]
        },
        value: { type: Schema.Types.Mixed, required: true },
        logic: { 
          type: String, 
          enum: ["AND", "OR"],
          required: false 
        }
      }
    ],
    audience_size: { type: Number, required: true, default: 0 },
    created_by: { type: String }, 
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model<ISegment>("Segment", SegmentSchema);