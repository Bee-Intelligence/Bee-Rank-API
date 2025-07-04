import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";

const router = express.Router();

// Validation schemas
const registerDeviceSchema = z.object({
  user_id: z.string(),
  device_token: z.string().min(1),
  device_type: z.enum(["ios", "android", "web"]),
  device_model: z.string().optional(),
  os_version: z.string().optional(),
  app_version: z.string().optional(),
  is_active: z.boolean().optional(),
});

const updateDeviceSchema = registerDeviceSchema.partial();

// Register device
router.post("/register", async (req: Request, res: Response) => {
  try {
    const validatedData = registerDeviceSchema.parse(req.body);

    // Mock response - replace with actual service call
    const device = {
      id: Date.now().toString(),
      ...validatedData,
      is_active: validatedData.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: device,
      message: "Device registered successfully",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    console.error("Register device error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to register device",
    });
  }
});

// Get user devices
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { is_active, device_type } = req.query;

    // Mock response - replace with actual service call
    const devices = [
      {
        id: "1",
        user_id: userId,
        device_token: "token123",
        device_type: "ios",
        device_model: "iPhone 14",
        os_version: "16.0",
        app_version: "1.0.0",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      },
    ];

    res.json({
      success: true,
      data: devices,
    });
  } catch (error: any) {
    console.error("Get user devices error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user devices",
    });
  }
});

// Update device
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateDeviceSchema.parse(req.body);

    // Mock response - replace with actual service call
    const updatedDevice = {
      id,
      ...validatedData,
      updated_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: updatedDevice,
      message: "Device updated successfully",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    console.error("Update device error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update device",
    });
  }
});

// Deactivate device
router.patch("/:id/deactivate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers["user-id"] as string;

    // Mock response - replace with actual service call
    const deactivatedDevice = {
      id,
      user_id: userId,
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: deactivatedDevice,
      message: "Device deactivated successfully",
    });
  } catch (error: any) {
    console.error("Deactivate device error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to deactivate device",
    });
  }
});

// Delete device
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers["user-id"] as string;

    // Mock response - replace with actual service call
    res.json({
      success: true,
      message: "Device deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete device error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete device",
    });
  }
});

// Update device token
router.patch("/:id/token", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { device_token } = req.body;

    if (!device_token) {
      return res.status(400).json({
        success: false,
        message: "Device token is required",
      });
    }

    // Mock response - replace with actual service call
    const updatedDevice = {
      id,
      device_token,
      updated_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: updatedDevice,
      message: "Device token updated successfully",
    });
  } catch (error: any) {
    console.error("Update device token error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update device token",
    });
  }
});

// Update last seen
router.patch("/:id/ping", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Mock response - replace with actual service call
    const device = {
      id,
      last_seen: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: device,
      message: "Device last seen updated",
    });
  } catch (error: any) {
    console.error("Update device last seen error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update device last seen",
    });
  }
});

// Get device statistics
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { user_id, start_date, end_date } = req.query;

    // Mock response - replace with actual service call
    const stats = {
      total_devices: 150,
      active_devices: 120,
      device_types: {
        ios: 60,
        android: 50,
        web: 10,
      },
      new_registrations_today: 5,
      last_7_days: 25,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Get device stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch device statistics",
    });
  }
});

export default router;
