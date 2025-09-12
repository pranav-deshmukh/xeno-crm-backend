import { FilterQuery } from "mongoose";
import { ICustomer } from "../models/Customer";

export interface Rule {
  id: string;
  field: "total_spent" | "last_order_date" | "total_orders" | "city" | "registration_date";
  operator: ">" | "<" | ">=" | "<=" | "=" | "!=" | "contains" | "not_contains" | "older_than";
  value: string | number | Date;
  logic?: "AND" | "OR";
}


const parseValue = (value: string | number | Date, field: string): any => {
  if (field.includes("date")) {
    return new Date(value);
  }
  if (typeof value === "string" && !isNaN(Number(value))) {
    return Number(value);
  }
  return value;
};


export const buildMongoQuery = (rules: Rule[]): FilterQuery<ICustomer> => {
  if (!rules || rules.length === 0) return {};

  const conditions = rules.map((rule) => {
    const { field, operator, value } = rule;

    switch (operator) {
      case ">":
        return { [field]: { $gt: parseValue(value, field) } };
      case "<":
        return { [field]: { $lt: parseValue(value, field) } };
      case ">=":
        return { [field]: { $gte: parseValue(value, field) } };
      case "<=":
        return { [field]: { $lte: parseValue(value, field) } };
      case "=":
        return { [field]: parseValue(value, field) };
      case "!=":
        return { [field]: { $ne: parseValue(value, field) } };
      case "contains":
        return { [field]: { $regex: value, $options: "i" } };
      case "not_contains":
        return { [field]: { $not: { $regex: value, $options: "i" } } };
      case "older_than":
        const daysAgo = new Date(Date.now() - (Number(value) * 24 * 60 * 60 * 1000));
        return { [field]: { $lt: daysAgo } };
      default:
        return {};
    }
  });
  return buildLogicalQuery(rules, conditions);
};

const buildLogicalQuery = (rules: Rule[], conditions: any[]) => {
  const groups: any[] = [];
  let currentGroup: any[] = [conditions[0]];

  for (let i = 1; i < rules.length; i++) {
    if (rules[i - 1].logic === "OR") {
      groups.push({ $and: currentGroup });
      currentGroup = [conditions[i]];
    } else {
      currentGroup.push(conditions[i]);
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup.length === 1 ? currentGroup[0] : { $and: currentGroup });
  }

  return groups.length === 1 ? groups[0] : { $or: groups };
};