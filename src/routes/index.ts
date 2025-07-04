import express from "express";
import analyticsRoutes from "./analyticsRoutes";
import authRoutes from "./authRoutes";
import deviceRoutes from "./deviceRoutes";
import fileRoutes from "./fileRoutes";
import healthRoutes from "./healthRoutes";
import hikingSignRoutes from "./hikingSignRoutes";
import { journeyRoutes } from "./journeyRoutes";
import locationRoutes from "./locationRoutes";
import notificationRoutes from "./notificationRoutes";
import reviewRoutes from "./reviewRoutes";
import searchRoutes from "./searchRoutes";
import taxiRankRoutes from "./taxiRankRoutes";
import transitRouteRoutes from "./transitRouteRoutes";
import userActivityRoutes from "./userActivityRoutes";
import userRoutes from "./userRoutes";

const router = express.Router();

// Health checks (should be first)
router.use("/health", healthRoutes);

// Authentication routes
router.use("/auth", authRoutes);

// Core user management
router.use("/users", userRoutes);

// Main application routes
router.use("/journeys", journeyRoutes);
router.use("/taxi-ranks", taxiRankRoutes);
router.use("/routes", transitRouteRoutes);
router.use("/hiking-signs", hikingSignRoutes);

// Supporting services
router.use("/locations", locationRoutes);
router.use("/search", searchRoutes);
router.use("/user-activity", userActivityRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/files", fileRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/devices", deviceRoutes);

// API documentation endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Bee Rank API",
    version: "1.0.0",
    endpoints: [
      "/health - Health check endpoints",
      "/auth - Authentication endpoints",
      "/users - User management",
      "/journeys - Journey management",
      "/taxi-ranks - Taxi rank management",
      "/routes - Transit route management",
      "/hiking-signs - Hiking sign management",
      "/locations - Location services",
      "/search - Search functionality",
      "/activities - User activity tracking",
      "/analytics - Analytics and events",
      "/files - File management",
      "/reviews - Reviews and ratings",
      "/notifications - Push notifications",
      "/devices - Device management",
    ],
    timestamp: new Date().toISOString(),
  });
});

export default router;
