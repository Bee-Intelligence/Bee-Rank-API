export interface NotificationSearchParams {
  user_id?: string;
  type?: string;
  category?: string;
  is_read?: boolean;
  delivery_status?: "pending" | "sent" | "delivered" | "failed";
  limit?: number;
  offset?: number;
}
