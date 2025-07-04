export interface CreateFileRequest {
  user_id?: string;
  filename: string;
  original_filename?: string;
  file_type: string;
  file_category?: string;
  size_bytes: number;
  mime_type?: string;
  file_hash: string;
  storage_path: string;
  public_url?: string;
  alt_text?: string;
  metadata?: Record<string, any>;
  is_public?: boolean;
}
