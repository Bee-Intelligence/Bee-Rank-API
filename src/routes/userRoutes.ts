import express from "express";
import { UserController } from "../controllers/UserController";
import { UserService } from "../services";

const router = express.Router();
const userService = new UserService();
const userController = new UserController(userService);

// User management routes
router.get("/", userController.getAll);
router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);
router.get("/:id", userController.getById);
router.get("/:id/activity", userController.getUserActivity);
router.post("/", userController.create);
router.put("/:id", userController.update);
router.delete("/:id", userController.delete);

export default router;
