export interface UpdateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_image_url?: string;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  is_first_time_launch?: boolean;
  metadata?: Record<string, any>;
  is_active?: boolean;
}
