// User interface
import type { TimestampFields } from "../Common/TimestampFields";

export interface User extends TimestampFields {
  id: string;
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_image_url?: string;
  role: "USER" | "ADMIN" | "OPERATOR";
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_first_time_launch: boolean;
  last_login?: Date;
  metadata: Record<string, any>;
  is_active: boolean;
}
