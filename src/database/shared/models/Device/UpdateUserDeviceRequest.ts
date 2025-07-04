export interface UpdateUserDeviceRequest {
  device_name?: string;
  app_version?: string;
  os_version?: string;
  push_enabled?: boolean;
  subscribed_topics?: string[];
  timezone?: string;
  locale?: string;
  is_active?: boolean;
}
