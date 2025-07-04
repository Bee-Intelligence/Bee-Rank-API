export interface UserProfile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_image_url?: string;
  role: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  created_at: Date;
}
