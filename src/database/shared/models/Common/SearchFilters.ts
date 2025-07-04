export interface SearchFilters {
  query?: string;
  filters?: Record<string, any>;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}
