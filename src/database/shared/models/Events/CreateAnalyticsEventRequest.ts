export interface CreateAnalyticsEventRequest {
  user_id?: string;
  event_type: string;
  event_category?: string;
  event_action?: string;
  event_label?: string;
  event_value?: number;
  event_data?: Record<string, any>;
  session_id?: string;
  device_info?: Record<string, any>;
  user_agent?: string;
  ip_address?: string;
  referrer?: string;
  page_url?: string;
}
