export interface UpdateSystemSettingRequest {
  setting_value?: string;
  setting_type?: string;
  description?: string;
  is_public?: boolean;
  updated_by?: string;
}
