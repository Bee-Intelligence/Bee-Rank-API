export interface CreateUserRequest {
  user_name: string;
  phone_number: number;
  email: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_image_url?: string;
  role?: "USER" | "ADMIN" | "OPERATOR";
  is_first_time_launch: boolean;
}
