export type SortOrder = "ASC" | "DESC";

export interface SortOption {
  [column: string]: SortOrder;
}

export interface FilterOption {
  [column: string]: any;
}

export const operatorsMap = {
  eq: "=",
  ne: "!=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  in: "IN",
  nin: "NOT IN",
  like: "LIKE",
};
