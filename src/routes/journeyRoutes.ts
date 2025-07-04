import express from "express";
import { JourneyController } from "../controllers/JourneyController";
import { JourneyService } from "../services";

const router = express.Router();
const journeyService = new JourneyService("journey");
const journeyController = new JourneyController(journeyService);

// Journey management routes
router.get("/", journeyController.getAll);
router.get("/my-journeys", journeyController.getUserJourneys);
router.get("/stats", journeyController.getJourneyStats);
router.get("/:id", journeyController.getById);
router.post("/", journeyController.create);
router.put("/:id", journeyController.update);
router.patch("/:id/status", journeyController.updateStatus);
router.delete("/:id", journeyController.delete);

export { router as journeyRoutes };
