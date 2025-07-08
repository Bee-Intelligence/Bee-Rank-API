import express from "express";
import type { Request, Response } from "express";
import { ServiceManager } from "../services";
import type { AuthService, UserService } from "../services";

const router = express.Router();

// Register new User
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    // Basic validation
    if (!email || !password || !name) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["email", "password", "name"],
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Get the auth service
    const authService = ServiceManager.getInstance().getService<AuthService>("auth");
    if (!authService) {
      return res.status(503).json({
        success: false,
        message: "Authentication service unavailable",
      });
    }

    // Register the user
    const { user, tokens } = await authService.register({
      email,
      password,
      first_name: name.split(' ')[0],
      last_name: name.split(' ').slice(1).join(' ') || undefined,
      phone: phone || undefined,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("Error registering User:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register User",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Login User
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Get the auth service
    const authService = ServiceManager.getInstance().getService<AuthService>("auth");
    if (!authService) {
      return res.status(503).json({
        success: false,
        message: "Authentication service unavailable",
      });
    }

    // Login the user
    const loginResponse = await authService.login({ email, password });

    res.json({
      success: true,
      message: "Login successful",
      user: loginResponse.user,
      token: loginResponse.tokens.access_token,
      refresh_token: loginResponse.tokens.refresh_token,
      expires_in: loginResponse.tokens.expires_in,
    });
  } catch (error) {
    console.error("Error logging in User:", error);

    // Handle specific errors
    if (error instanceof Error && error.message === "Invalid email or password") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Logout User
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Get the auth service
    const authService = ServiceManager.getInstance().getService<AuthService>("auth");
    if (!authService) {
      return res.status(503).json({
        success: false,
        message: "Authentication service unavailable",
      });
    }

    // Logout the user
    await authService.logout((req as any).user?.id || "unknown", refresh_token);

    // logout returns void, so we assume success if no error is thrown

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Error logging out User:", error);
    res.status(500).json({
      success: false,
      message: "Failed to logout",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Refresh token
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Get the auth service
    const authService = ServiceManager.getInstance().getService<AuthService>("auth");
    if (!authService) {
      return res.status(503).json({
        success: false,
        message: "Authentication service unavailable",
      });
    }

    // Refresh the token
    const tokens = await authService.refreshToken(refresh_token);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });
  } catch (error) {
    console.error("Error refreshing token:", error);

    // Handle specific errors
    if (error instanceof Error && 
        (error.message === "Invalid refresh token" || 
         error.message === "Refresh token expired")) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to refresh token",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Forgot password
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Get the auth service
    const authService = ServiceManager.getInstance().getService<AuthService>("auth");
    if (!authService) {
      return res.status(503).json({
        success: false,
        message: "Authentication service unavailable",
      });
    }

    // Generate a password reset token
    await authService.resetPassword(email);

    // In a real application, you would send an email with the reset link
    // For now, we'll just return the token in the response
    res.json({
      success: true,
      message: "Password reset email sent successfully",
      email,
      // Only include the token in development environment
      // resetToken is not available in this scope since resetPassword doesn't return it
    });
  } catch (error) {
    console.error("Error processing forgot password:", error);

    // Handle specific errors
    if (error instanceof Error && error.message === "User not found") {
      // Don't reveal that the user doesn't exist for security reasons
      return res.json({
        success: true,
        message: "If your email is registered, you will receive a password reset link",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to process forgot password request",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Reset password
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    // Password validation
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Get the auth service
    const authService = ServiceManager.getInstance().getService<AuthService>("auth");
    if (!authService) {
      return res.status(503).json({
        success: false,
        message: "Authentication service unavailable",
      });
    }

    // Reset the password
    await authService.confirmPasswordReset(token, new_password);
    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);

    // Handle specific errors
    if (error instanceof Error && 
        (error.message === "Invalid reset token" || 
         error.message === "Reset token expired")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get current User profile
router.get("/me", async (req: Request, res: Response) => {
  try {
    // Get the auth token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(' ')[1];

    // Get the auth service
    const authService = ServiceManager.getInstance().getService<AuthService>("auth");
    if (!authService) {
      return res.status(503).json({
        success: false,
        message: "Authentication service unavailable",
      });
    }

    // Verify the token and extract user info
    // Remove this duplicate line since we have it below

    // Get the user service
    const userService = ServiceManager.getInstance().getService<UserService>("user");
    if (!userService) {
      return res.status(503).json({
        success: false,
        message: "User service unavailable",
      });
    }

    // Get the user profile
    const tokenData = await authService.verifyToken(token);
    const user = await userService.getUserById(tokenData.user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return the user profile without sensitive information
    res.json({
      success: true,
      message: "User profile retrieved successfully",
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name || ""}`.trim(),
        phone: user.phone || null,
        role: user.role || "USER",
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error("Error getting User profile:", error);

    // Handle token verification errors
    if (error instanceof Error && error.message === "Invalid token") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to get User profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Update User profile
router.put("/me", async (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body;

    // Get the auth token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(' ')[1];

    // Get the auth service
    const authService = ServiceManager.getInstance().getService<AuthService>("auth");
    if (!authService) {
      return res.status(503).json({
        success: false,
        message: "Authentication service unavailable",
      });
    }

    // Verify the token and extract user info
    // Remove this duplicate line since we have it below

    // Get the user service
    const userService = ServiceManager.getInstance().getService<UserService>("user");
    if (!userService) {
      return res.status(503).json({
        success: false,
        message: "User service unavailable",
      });
    }

    // Parse the name into first and last name
    let first_name, last_name;
    if (name) {
      const nameParts = name.split(' ');
      first_name = nameParts[0];
      last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
    }

    // Update the user profile
    const tokenData = await authService.verifyToken(token);
    const updatedUser = await userService.updateUser(tokenData.user_id, {
      ...(first_name && { first_name }),
      ...(last_name && { last_name }),
      ...(phone && { phone }),
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return the updated user profile
    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: `${updatedUser.first_name} ${updatedUser.last_name || ""}`.trim(),
        phone: updatedUser.phone || null,
        role: updatedUser.role || "USER",
        updated_at: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error("Error updating User profile:", error);

    // Handle token verification errors
    if (error instanceof Error && error.message === "Invalid token") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Change password
router.put("/change-password", async (req: Request, res: Response) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // Password validation
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Get the auth token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(' ')[1];

    // Get the auth service
    const authService = ServiceManager.getInstance().getService<AuthService>("auth");
    if (!authService) {
      return res.status(503).json({
        success: false,
        message: "Authentication service unavailable",
      });
    }

    // Verify the token and extract user info
    const tokenData = await authService.verifyToken(token);

    // Change the password
    await authService.changePassword(
      tokenData.user_id,
      current_password,
      new_password
    );

    // changePassword returns void, so we assume success if no error is thrown
    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === "Invalid token") {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      } else if (error.message === "Current password is incorrect") {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      } else if (error.message === "User not found") {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
