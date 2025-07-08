import { BaseService } from "../../core/base/BaseService";
import type { IBaseService } from "../../interfaces/IBaseService";
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'DRIVER';
  is_active: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface TokenPayload {
  user_id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export class AuthService extends BaseService {
  private initialized = false;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private saltRounds = 12;

  constructor() {
    super('AuthService');
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
  }

  async init(): Promise<void> {
    console.log('Initializing AuthService');
    
    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET not set in environment variables, using default');
    }
    
    this.initialized = true;
  }

  async register(registerData: RegisterData): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      console.log('Registering new user', { email: registerData.email });
      
      // Check if user already exists
      const existingUser = await this.getUserByEmail(registerData.email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }
      
      // Hash password
      const passwordHash = await this.hashPassword(registerData.password);
      
      // Mock user creation - replace with actual database call
      const user: AuthUser = {
        id: this.generateUserId(),
        email: registerData.email,
        role: 'USER',
        is_active: true,
      };
      
      // Generate tokens
      const tokens = await this.generateTokens(user);
      
      return { user, tokens };
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      console.log('User login attempt', { email: credentials.email });
      
      // Get user by email - mock implementation
      const user = await this.getUserByEmail(credentials.email);
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }
      
      // Verify password - mock implementation
      const isValidPassword = await this.verifyPassword(credentials.password, 'stored-hash');
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }
      
      // Generate tokens
      const tokens = await this.generateTokens(user);
      
      return { user, tokens };
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      console.log('Refreshing access token');
      
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as TokenPayload;
      
      // Get user - mock implementation
      const user = await this.getUserById(payload.user_id);
      if (!user || !user.is_active) {
        throw new Error('Invalid refresh token');
      }
      
      // Generate new tokens
      return await this.generateTokens(user);
    } catch (error) {
      this.handleError(error as Error);
      throw new Error('Invalid refresh token');
    }
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as TokenPayload;
      
      // Verify user still exists and is active
      const user = await this.getUserById(payload.user_id);
      if (!user || !user.is_active) {
        throw new Error('Token user not found or inactive');
      }
      
      return payload;
    } catch (error) {
      this.handleError(error as Error);
      throw new Error('Invalid token');
    }
  }

  async logout(userId: string, token: string): Promise<void> {
    try {
      console.log('User logout', { userId });
      
      // In a real implementation, you would:
      // 1. Add token to blacklist
      // 2. Clear user sessions
      // 3. Log the logout activity
      
      // Mock implementation
      console.log('User logged out successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      console.log('Changing password for user', { userId });
      
      // Get user - mock implementation
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify current password - mock implementation
      const isValidPassword = await this.verifyPassword(currentPassword, 'stored-hash');
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }
      
      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);
      
      // Update password in database - mock implementation
      console.log('Password updated successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      console.log('Password reset requested', { email });
      
      // Get user by email - mock implementation
      const user = await this.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not
        console.log('Password reset email sent (if user exists)');
        return;
      }
      
      // Generate reset token
      const resetToken = this.generateResetToken();
      
      // Store reset token - mock implementation
      // Send reset email - mock implementation
      console.log('Password reset email sent');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async confirmPasswordReset(
    resetToken: string,
    newPassword: string
  ): Promise<void> {
    try {
      console.log('Confirming password reset');
      
      // Verify reset token - mock implementation
      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);
      
      // Update password in database - mock implementation
      console.log('Password reset completed');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async generateTokens(user: AuthUser): Promise<AuthTokens> {
    const payload = {
      user_id: user.id,
      email: user.email,
      role: user.role,
    };
    
    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, { expiresIn: '7d' });
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 15 * 60, // 15 minutes in seconds
      token_type: 'Bearer',
    };
  }

  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResetToken(): string {
    return `reset_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  // Mock database methods - replace with actual database calls
  private async getUserByEmail(email: string): Promise<AuthUser | null> {
    // Mock implementation
    return null;
  }

  private async getUserById(id: string): Promise<AuthUser | null> {
    // Mock implementation
    return null;
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    return {
      status: 'healthy',
      details: {
        service: 'AuthService',
        initialized: this.initialized,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down AuthService');
    this.initialized = false;
  }
}