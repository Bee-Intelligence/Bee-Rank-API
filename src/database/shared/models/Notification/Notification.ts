export interface Notification {
  id: number;
  user_id: string;
  title: string;
  body: string;
  type: string;
  category?: string;
  data: Record<string, any>;
  sent_at?: Date;
  read_at?: Date;
  action_taken_at?: Date;
  delivery_status: "pending" | "sent" | "delivered" | "failed";
  is_read: boolean;
  priority: number;
  expires_at?: Date;
  created_at: Date;
}
