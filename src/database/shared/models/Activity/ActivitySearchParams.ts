export interface ActivitySearchParams {
  user_id?: string;
  activity_type?: string;
  entity_type?: string;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}
