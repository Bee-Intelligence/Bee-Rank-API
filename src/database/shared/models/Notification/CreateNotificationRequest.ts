export interface CreateNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  type?: string;
  category?: string;
  data?: Record<string, any>;
  priority?: number;
  expires_at?: Date;
}
