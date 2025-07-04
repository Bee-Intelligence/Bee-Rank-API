import express from "express";
import { ServiceManager } from "../services";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const serviceManager = ServiceManager.getInstance();
    const healthData = await serviceManager.healthCheck();

    const isHealthy = Object.values(healthData).every(
      (service: any) => service.status === "healthy",
    );

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services: healthData,
      serviceCount: serviceManager.getServiceCount(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Health check failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
