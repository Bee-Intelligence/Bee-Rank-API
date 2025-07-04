import express from "express";
import { ServiceManager } from "../services";
import type { LocationService } from "../services";

const router = express.Router();

router.post("/update", async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    const userId = "demo-User"; // Replace with actual User ID from auth

    // Validate required fields
    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    const locationService =
      ServiceManager.getInstance().getService<LocationService>("location");

    if (!locationService) {
      return res
        .status(500)
        .json({ message: "Location service not available" });
    }

    await locationService.updateUserLocation(userId, {
      latitude: Number.parseFloat(latitude),
      longitude: Number.parseFloat(longitude),
      accuracy: accuracy ? Number.parseFloat(accuracy) : undefined,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ message: "Failed to update location" });
  }
});

router.get("/nearby", async (req, res) => {
  try {
    const { latitude, longitude, radius, type } = req.query;

    // Validate required fields
    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    if (!type || !["taxi_ranks", "hiking_signs"].includes(type as string)) {
      return res
        .status(400)
        .json({
          message: "Valid type is required (taxi_ranks or hiking_signs)",
        });
    }

    const locationService =
      ServiceManager.getInstance().getService<LocationService>("location");

    if (!locationService) {
      return res
        .status(500)
        .json({ message: "Location service not available" });
    }

    const entities = await locationService.getNearbyEntities({
      latitude: Number.parseFloat(latitude as string),
      longitude: Number.parseFloat(longitude as string),
      radius: Number.parseFloat(radius as string) || 5,
      type: type as "taxi_ranks" | "hiking_signs",
    });

    res.json(entities);
  } catch (error) {
    console.error("Error fetching nearby entities:", error);
    res.status(500).json({ message: "Failed to fetch nearby entities" });
  }
});

export default router;
