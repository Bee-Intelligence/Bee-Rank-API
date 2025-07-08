import express from "express";
import { TransitRouteController } from "../controllers/TransitRouteController";
// TransitRouteService not implemented yet
// import { TransitRouteService } from "../services";

const router = express.Router();
// TransitRouteService not implemented yet
const transitRouteController = new TransitRouteController();

// Transit route management routes
router.get("/", transitRouteController.getAll);
router.get("/find", transitRouteController.findRoutes);
router.get("/rank/:rankId", transitRouteController.getRoutesByRank);
router.get("/:id", transitRouteController.getById);
router.post("/", transitRouteController.create);
router.post("/calculate", transitRouteController.calculateRoutes);
router.put("/:id", transitRouteController.update);
router.delete("/:id", transitRouteController.delete);

export default router;
