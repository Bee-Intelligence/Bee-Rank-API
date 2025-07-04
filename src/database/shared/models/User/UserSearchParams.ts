export interface UserSearchParams {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  is_active?: boolean;
  limit?: number;
  offset?: number;
  page?: number;
  per_page?: number;
}
