export interface AnalyticsSearchParams {
  user_id?: string;
  event_type?: string;
  event_category?: string;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}
