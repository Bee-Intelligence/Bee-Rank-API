import express from "express";
import multer from "multer";
import { HikingSignController } from "../controllers/HikingSignController";
import { HikingSignService } from "../services";

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

const hikingSignService = new HikingSignService("hikingSign");
const hikingSignController = new HikingSignController(hikingSignService);

// Hiking sign management routes
router.get("/", hikingSignController.getAll);
router.get("/my-signs", hikingSignController.getUserSigns);
router.get("/nearby", hikingSignController.getNearby);
router.get("/verified", hikingSignController.getVerified);
router.get("/:id", hikingSignController.getById);
router.post("/", upload.single("image"), hikingSignController.create);
router.put("/:id", hikingSignController.update);
router.patch("/:id/verify", hikingSignController.verify);
router.delete("/:id", hikingSignController.delete);

export default router;
