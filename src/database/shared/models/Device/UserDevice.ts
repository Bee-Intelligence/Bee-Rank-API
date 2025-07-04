import type { TimestampFields } from "../Common/TimestampFields";

export interface UserDevice extends TimestampFields {
  id: number;
  user_id: string;
  device_token: string;
  device_id?: string;
  device_name?: string;
  platform: "ios" | "android" | "web";
  app_version?: string;
  os_version?: string;
  device_model?: string;
  push_enabled: boolean;
  subscribed_topics: string[];
  timezone?: string;
  locale?: string;
  is_active: boolean;
  last_active: Date;
}
