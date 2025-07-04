export interface UpdateNotificationRequest {
  is_read?: boolean;
  read_at?: Date;
  action_taken_at?: Date;
  delivery_status?: "pending" | "sent" | "delivered" | "failed";
}
