import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Customer from "../models/Customer";
import Segment from "../models/Segment";
import { buildMongoQuery, Rule } from "../utils/buildMongoQuery";
import { PreviewRequest, PreviewResponse } from "../types/preview";

export const previewSegment = async (req: Request, res: Response) => {
  try {
    const { rules } = req.body as PreviewRequest;

    const query = buildMongoQuery(rules);
    const customers = await Customer.find(query);

    const demographics: PreviewResponse["demographics"] = {
      by_city: {},
      by_spending_tier: {
        "Low (0-5K)": 0,
        "Medium (5K-20K)": 0,
        "High (20K+)": 0,
      },
      by_recency: {
        "Active (0-30 days)": 0,
        "Inactive (30-90 days)": 0,
        "Dormant (90+ days)": 0,
      },
    };

    const now = new Date();

    customers.forEach((c) => {
      if (c.city) {
        demographics.by_city[c.city] = (demographics.by_city[c.city] || 0) + 1;
      }

      if (c.total_spent <= 5000) {
        demographics.by_spending_tier["Low (0-5K)"]++;
      } else if (c.total_spent <= 20000) {
        demographics.by_spending_tier["Medium (5K-20K)"]++;
      } else {
        demographics.by_spending_tier["High (20K+)"]++;
      }

      if (c.last_order_date) {
        const diffDays = Math.floor(
          (now.getTime() - c.last_order_date.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays <= 30) {
          demographics.by_recency["Active (0-30 days)"]++;
        } else if (diffDays <= 90) {
          demographics.by_recency["Inactive (30-90 days)"]++;
        } else {
          demographics.by_recency["Dormant (90+ days)"]++;
        }
      }
    });

    const response: PreviewResponse = {
      count: customers.length,
      demographics,
    };

    res.json(response);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const saveSegment = async (req: Request, res: Response) => {
  try {
    const { name, description, rules } = req.body;

    const query = buildMongoQuery(rules);
    const audienceSize = await Customer.countDocuments(query);

    const segment = new Segment({
      segment_id: uuidv4(),
      name,
      description,
      rules,
      audience_size: audienceSize,
    });

    await segment.save();

    res.status(201).json({
      message: "Segment saved successfully",
      segment: {
        id: segment.segment_id,
        name: segment.name,
        audience_size: audienceSize,
      },
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getSegments = async (req: Request, res: Response) => {
  try {
    const segments = await Segment.find()
      .select("segment_id name description audience_size created_at")
      .sort({ created_at: -1 });

    res.json(segments);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getSegmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const segment = await Segment.findOne({ segment_id: id });

    if (!segment) {
      return res.status(404).json({ error: "Segment not found" });
    }

    res.json(segment);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};