import { BaseService } from "./BaseService";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import type { UserService } from "./UserService";
import { ServiceManager } from "./ServiceManager";
import type { CreateUserRequest } from "../types/database.types";

// Define types for auth
interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface LoginResponse {
  user: AuthUser;
  token: string;
  refresh_token: string;
  expires_in: number;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthService extends BaseService {
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly JWT_EXPIRES_IN: string | number;
  private readonly JWT_REFRESH_EXPIRES_IN: string | number;
  private readonly SALT_ROUNDS: number;

  // Store for refresh tokens (in a real app, this would be in a database)
  private refreshTokens: Map<string, { userId: string; expiresAt: Date }>;

  // Store for password reset tokens (in a real app, this would be in a database)
  private passwordResetTokens: Map<string, { userId: string; expiresAt: Date }>;

  constructor(serviceName: string) {
    super(serviceName);
    this.JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
    this.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
    this.SALT_ROUNDS = 10;
    this.refreshTokens = new Map();
    this.passwordResetTokens = new Map();
  }

  async initialize(): Promise<void> {
    console.log("✅ AuthService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 AuthService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return { status: "healthy" };
  }

  // Register a new user
  async registerUser(userData: CreateUserRequest): Promise<AuthUser> {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

      // Get the user service
      const userService = ServiceManager.getInstance().getService<UserService>("user");
      if (!userService) {
        throw new Error("User service unavailable");
      }

      // Create the user with hashed password
      // We need to create a new object with the correct properties
      // and cast it to any to bypass TypeScript's type checking
      const userDataWithHash: any = {
        ...userData,
        user_name: userData.user_name || userData.email,
        phone_number: userData.phone_number || 0,
        is_first_time_launch: userData.is_first_time_launch || true,
      };

      // Add password_hash property
      userDataWithHash.password_hash = hashedPassword;

      // Remove the password property as it's not needed anymore
      delete userDataWithHash.password;

      const user = await userService.createUser(userDataWithHash);

      // Return user data without sensitive information
      return {
        id: user.id,
        email: user.email || '',
        name: `${user.first_name || ''} ${user.last_name || ""}`.trim(),
        role: user.role || "USER",
      };
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  }

  // Login a user
  async loginUser(email: string, password: string): Promise<LoginResponse> {
    try {
      // Get the user service
      const userService = ServiceManager.getInstance().getService<UserService>("user");
      if (!userService) {
        throw new Error("User service unavailable");
      }

      // Find the user by email
      const user = await userService.getUserByEmail(email);
      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Check if the password is correct
      const isPasswordValid = await bcrypt.compare(password, user.password_hash || '');
      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email || '',
        role: user.role || "USER",
      };

      // Create sign options
      const signOptions: SignOptions = { 
        expiresIn: this.JWT_EXPIRES_IN as any
      };

      // Sign the token
      const token = jwt.sign(
        tokenPayload, 
        this.JWT_SECRET as Secret, 
        signOptions
      );

      // Create refresh sign options
      const refreshSignOptions: SignOptions = { 
        expiresIn: this.JWT_REFRESH_EXPIRES_IN as any
      };

      // Sign the refresh token
      const refreshToken = jwt.sign(
        tokenPayload, 
        this.JWT_REFRESH_SECRET as Secret, 
        refreshSignOptions
      );

      // Store refresh token
      const refreshExpiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      this.refreshTokens.set(refreshToken, {
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshExpiresIn),
      });

      // Return user data and tokens
      return {
        user: {
          id: user.id,
          email: user.email || '',
          name: `${user.first_name || ''} ${user.last_name || ""}`.trim(),
          role: user.role || "USER",
        },
        token,
        refresh_token: refreshToken,
        expires_in: 3600, // 1 hour in seconds
      };
    } catch (error) {
      console.error("Error logging in user:", error);
      throw error;
    }
  }

  // Logout a user
  async logoutUser(refreshToken: string): Promise<boolean> {
    // Remove the refresh token
    return this.refreshTokens.delete(refreshToken);
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<{ token: string; refresh_token: string; expires_in: number }> {
    try {
      // Check if the refresh token exists and is valid
      const storedToken = this.refreshTokens.get(refreshToken);
      if (!storedToken) {
        throw new Error("Invalid refresh token");
      }

      // Check if the token has expired
      if (storedToken.expiresAt < new Date()) {
        this.refreshTokens.delete(refreshToken);
        throw new Error("Refresh token expired");
      }

      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as TokenPayload;

      // Create token payload
      const tokenPayload = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      // Create sign options
      const signOptions: SignOptions = { 
        expiresIn: this.JWT_EXPIRES_IN as any
      };

      // Generate a new access token
      const newToken = jwt.sign(
        tokenPayload,
        this.JWT_SECRET as Secret,
        signOptions
      );

      // Create refresh sign options
      const refreshSignOptions: SignOptions = { 
        expiresIn: this.JWT_REFRESH_EXPIRES_IN as any
      };

      // Generate a new refresh token
      const newRefreshToken = jwt.sign(
        tokenPayload,
        this.JWT_REFRESH_SECRET as Secret,
        refreshSignOptions
      );

      // Remove the old refresh token
      this.refreshTokens.delete(refreshToken);

      // Store the new refresh token
      const refreshExpiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      this.refreshTokens.set(newRefreshToken, {
        userId: decoded.userId,
        expiresAt: new Date(Date.now() + refreshExpiresIn),
      });

      // Return the new tokens
      return {
        token: newToken,
        refresh_token: newRefreshToken,
        expires_in: 3600, // 1 hour in seconds
      };
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw error;
    }
  }

  // Generate a password reset token
  async generatePasswordResetToken(email: string): Promise<string> {
    try {
      // Get the user service
      const userService = ServiceManager.getInstance().getService<UserService>("user");
      if (!userService) {
        throw new Error("User service unavailable");
      }

      // Find the user by email
      const user = await userService.getUserByEmail(email);
      if (!user) {
        throw new Error("User not found");
      }

      // Generate a reset token
      const resetToken = uuidv4();

      // Store the reset token
      const expiresIn = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      this.passwordResetTokens.set(resetToken, {
        userId: user.id,
        expiresAt: new Date(Date.now() + expiresIn),
      });

      return resetToken;
    } catch (error) {
      console.error("Error generating password reset token:", error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      // Check if the reset token exists and is valid
      const storedToken = this.passwordResetTokens.get(token);
      if (!storedToken) {
        throw new Error("Invalid reset token");
      }

      // Check if the token has expired
      if (storedToken.expiresAt < new Date()) {
        this.passwordResetTokens.delete(token);
        throw new Error("Reset token expired");
      }

      // Get the user service
      const userService = ServiceManager.getInstance().getService<UserService>("user");
      if (!userService) {
        throw new Error("User service unavailable");
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update the user's password
      // We need to create an object with the correct properties
      // and cast it to any to bypass TypeScript's type checking
      const updateData: any = {
        password_hash: hashedPassword
      };

      await userService.updateUser(storedToken.userId, updateData);

      // Remove the reset token
      this.passwordResetTokens.delete(token);

      return true;
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error;
    }
  }

  // Verify a token
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Get the user service
      const userService = ServiceManager.getInstance().getService<UserService>("user");
      if (!userService) {
        throw new Error("User service unavailable");
      }

      // Get the user
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Verify the current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash || '');
      if (!isPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update the user's password
      // We need to create an object with the correct properties
      // and cast it to any to bypass TypeScript's type checking
      const updateData: any = {
        password_hash: hashedPassword
      };

      await userService.updateUser(userId, updateData);

      return true;
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }
}
