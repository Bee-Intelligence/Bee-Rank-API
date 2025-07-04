import { sql } from "../config/db";
import type {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserProfile,
  UserSearchParams,
} from "../database/shared/models";
import { BaseService } from "./BaseService";

export class UserService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ UserService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 UserService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const [result] = await sql`SELECT 1 as health_check`;
      return { status: "healthy", details: { database: "connected" } };
    } catch (error: any) {
      return {
        status: "unhealthy",
        details: { error: error?.message || "Unknown error" },
      };
    }
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    return this.executeQuery(async () => {
      const [user] = await sql`
        INSERT INTO users (
          email, phone_number, first_name, last_name, profile_image_url,
          role, is_first_time_launch, is_active, created_at, updated_at
        )
        VALUES (
          ${userData.email || null}, ${userData.phone_number || null},
          ${userData.first_name || null}, ${userData.last_name || null},
          ${userData.profile_image_url || null}, ${userData.role || "user"},
          ${userData.is_first_time_launch ?? true}, true, NOW(), NOW()
        )
        RETURNING *
      `;
      return user as User;
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.executeQuery(async () => {
      const [user] = await sql`
        SELECT * FROM users
        WHERE id = ${id} AND is_active = true
      `;
      return (user as User) || null;
    });
  }

  async getUserProfile(id: string): Promise<UserProfile | null> {
    return this.executeQuery(async () => {
      const [profile] = await sql`
        SELECT id, email, phone_number, first_name, last_name,
               profile_image_url, role, is_email_verified,
               is_phone_verified, created_at
        FROM users
        WHERE id = ${id} AND is_active = true
      `;
      return (profile as UserProfile) || null;
    });
  }

  async getUsers(
    params: UserSearchParams,
  ): Promise<{ users: User[]; total: number }> {
    return this.executeQuery(async () => {
      const {
        limit = 20,
        offset = 0,
        email,
        first_name,
        last_name,
        role,
        is_email_verified,
        is_phone_verified,
        is_active,
      } = params;

      const whereConditions = ["u.is_active = true"];
      const queryParams: any[] = [];

      if (email) {
        whereConditions.push(`u.email ILIKE $${queryParams.length + 1}`);
        queryParams.push(`%${email}%`);
      }

      if (first_name) {
        whereConditions.push(`u.first_name ILIKE $${queryParams.length + 1}`);
        queryParams.push(`%${first_name}%`);
      }

      if (last_name) {
        whereConditions.push(`u.last_name ILIKE $${queryParams.length + 1}`);
        queryParams.push(`%${last_name}%`);
      }

      if (role) {
        whereConditions.push(`u.role = $${queryParams.length + 1}`);
        queryParams.push(role);
      }

      if (is_email_verified !== undefined) {
        whereConditions.push(
          `u.is_email_verified = $${queryParams.length + 1}`,
        );
        queryParams.push(is_email_verified);
      }

      if (is_phone_verified !== undefined) {
        whereConditions.push(
          `u.is_phone_verified = $${queryParams.length + 1}`,
        );
        queryParams.push(is_phone_verified);
      }

      if (is_active !== undefined) {
        whereConditions.push(`u.is_active = $${queryParams.length + 1}`);
        queryParams.push(is_active);
      }

      const whereClause = whereConditions.join(" AND ");

      const users = await sql`
        SELECT * FROM users u
        WHERE ${sql.unsafe(whereClause)}
        ORDER BY u.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count FROM users u
        WHERE ${sql.unsafe(whereClause)}
      `;

      return { users: users as User[], total: Number.parseInt(count) };
    });
  }

  async updateUser(
    id: string,
    userData: UpdateUserRequest,
  ): Promise<User | null> {
    return this.executeQuery(async () => {
      const updateFields = Object.keys(userData)
        .filter((key) => userData[key as keyof UpdateUserRequest] !== undefined)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(", ");

      if (!updateFields) {
        throw new Error("No fields to update");
      }

      const values = Object.keys(userData)
        .filter((key) => userData[key as keyof UpdateUserRequest] !== undefined)
        .map((key) => userData[key as keyof UpdateUserRequest]);

      const [user] = await sql`
        UPDATE users 
        SET ${sql.unsafe(updateFields)}, updated_at = NOW()
        WHERE id = ${id} AND is_active = true
        RETURNING *
      `;
      return (user as User) || null;
    });
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.executeQuery(async () => {
      const [result] = await sql`
        UPDATE users
        SET is_active = false, updated_at = NOW()
        WHERE id = ${id} AND is_active = true
          RETURNING id
      `;
      return !!result;
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.executeQuery(async () => {
      const [user] = await sql`
        SELECT * FROM users
        WHERE email = ${email} AND is_active = true
      `;
      return (user as User) || null;
    });
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.executeQuery(async () => {
      const [user] = await sql`
        SELECT * FROM users 
        WHERE phone_number = ${phoneNumber} AND is_active = true
      `;
      return (user as User) || null;
    });
  }

  async updateUserProfile(
    id: string,
    profileData: Partial<UserProfile>,
  ): Promise<UserProfile | null> {
    return this.executeQuery(async () => {
      const updateFields = Object.keys(profileData)
        .filter((key) => profileData[key as keyof UserProfile] !== undefined)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(", ");

      if (!updateFields) {
        throw new Error("No fields to update");
      }

      const values = Object.keys(profileData)
        .filter((key) => profileData[key as keyof UserProfile] !== undefined)
        .map((key) => profileData[key as keyof UserProfile]);

      const [profile] = await sql`
        UPDATE users 
        SET ${sql.unsafe(updateFields)}, updated_at = NOW()
        WHERE id = ${id} AND is_active = true
        RETURNING id, email, phone_number, first_name, last_name, 
                  profile_image_url, role, is_email_verified, 
                  is_phone_verified, created_at
      `;
      return (profile as UserProfile) || null;
    });
  }

  async verifyUserEmail(id: string): Promise<User | null> {
    return this.executeQuery(async () => {
      const [user] = await sql`
        UPDATE users
        SET is_email_verified = true, email_verified_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND is_active = true
          RETURNING *
      `;
      return (user as User) || null;
    });
  }

  async verifyUserPhone(id: string): Promise<User | null> {
    return this.executeQuery(async () => {
      const [user] = await sql`
        UPDATE users 
        SET is_phone_verified = true, phone_verified_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND is_active = true
        RETURNING *
      `;
      return (user as User) || null;
    });
  }
}
