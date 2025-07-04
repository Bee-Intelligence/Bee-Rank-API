import type { TimestampFields } from "../Common/TimestampFields";

export interface SystemSetting extends TimestampFields {
  id: number;
  setting_key: string;
  setting_value?: string;
  setting_type: string;
  description?: string;
  is_public: boolean;
  updated_by?: string;
}
