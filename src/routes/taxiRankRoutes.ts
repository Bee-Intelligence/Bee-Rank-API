import express from "express";
import { TaxiRankController } from "../controllers/TaxiRankController";
import { TaxiRankService } from "../services";

const router = express.Router();
const taxiRankService = new TaxiRankService("taxiRank");
const taxiRankController = new TaxiRankController(taxiRankService);

// Taxi rank management routes
router.get("/", taxiRankController.getAll);
router.get("/nearby", taxiRankController.getNearby);
router.get("/city/:city", taxiRankController.getByCity);
router.get("/province/:province", taxiRankController.getByProvince);
router.get("/:id", taxiRankController.getById);
router.post("/", taxiRankController.create);
router.put("/:id", taxiRankController.update);
router.delete("/:id", taxiRankController.delete);

export default router;
