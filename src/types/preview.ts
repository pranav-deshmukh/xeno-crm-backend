import { Rule } from "../utils/buildMongoQuery";

export interface PreviewRequest {
  rules: Rule[];
}

export interface PreviewResponse {
  count: number;
  demographics: {
    by_city: { [city: string]: number };
    by_spending_tier: {
      "Low (0-5K)": number;
      "Medium (5K-20K)": number;
      "High (20K+)": number;
    };
    by_recency: {
      "Active (0-30 days)": number;
      "Inactive (30-90 days)": number;
      "Dormant (90+ days)": number;
    };
  };
}
