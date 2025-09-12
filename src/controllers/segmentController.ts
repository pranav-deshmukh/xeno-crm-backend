import { Request, Response } from "express";
import Customer from "../models/Customer";
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
