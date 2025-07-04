import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler, notFoundHandler } from "./middleware/errorHandling";
import { ServiceManager } from "./services";
import type { WebSocketService } from "./services";

// Import all route files directly
import {initializeDatabase} from "./database/initializers/initializeDatabase";
import analyticsRoutes from "./routes/analyticsRoutes";
import authRoutes from "./routes/authRoutes";
import deviceRoutes from "./routes/deviceRoutes";
import fileRoutes from "./routes/fileRoutes";
import healthRoutes from "./routes/healthRoutes";
import locationRoutes from "./routes/locationRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import searchRoutes from "./routes/searchRoutes";

import taxiRankRoutes from "./routes/taxiRankRoutes";
import transitRouteRoutes from "./routes/transitRouteRoutes";
import userActivityRoutes from "./routes/userActivityRoutes";
import userRoutes from "./routes/userRoutes";
import { journeyRoutes } from "./routes/journeyRoutes";
import hikingSignRoutes from "./routes/hikingSignRoutes";

// Load environment variables
dotenv.config();

// Initialize database safely
initializeDatabase()
  .then(() => {
    console.log("✅ Database initialization completed");
  })
  .catch((error) => {
    console.error("❌ Database initialization failed:", error);
  });


const app = express();
const PORT = process.env.PORT || 5000;

// Create an HTTP server for WebSocket support
const server = createServer(app);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);

// Logging
app.use(morgan("combined"));

// Body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Bee Rank Backend API",
    version: "1.0.0",
    status: "running",
  });
});

// Basic health check (root level)
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Bee-Rank API",
    version: "1.0.0",
  });
});

// API test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "API is working!",
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      "GET /api/health",
      "GET /api/taxi-ranks",
      "GET /api/taxi-rank",
      "GET /api/taxi-ranks/stats",
      "GET /api/users",
      "GET /api/search",
      "GET /api/user-activities",
      "GET /api/files",
      "GET /api/journeys",
      "GET /api/analytics",
      "GET /api/reviews",
      "GET /api/locations",
      "GET /api/notifications",
      "GET /api/auth",
      "GET /api/devices",
      "GET /api/hiking-signs",
      "GET /api/transit-routes",
    ],
  });
});

// Request logging middleware for debugging (place BEFORE routes)
app.use("/api/*", (req, res, next) => {
  console.log(`🔍 API Request: ${req.method} ${req.originalUrl}`);
  console.log(`🔍 Query:`, req.query);
  if (req.method !== "GET") {
    console.log(`🔍 Body:`, req.body);
  }
  next();
});


// Routes - Mount each route directly in the server
app.use("/api/taxi-ranks", taxiRankRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/users", userRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/user-activities", userActivityRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/journeys", journeyRoutes); 
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/hiking-signs", hikingSignRoutes);
app.use("/api/transit-routes", transitRouteRoutes);

// Alternative route paths for compatibility
app.use("/api/ranks", taxiRankRoutes); // Also available as /api/ranks
app.use("/api/taxi-rank", taxiRankRoutes); // Redirect singular form to plural

// Catch all unmatched API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      "/api/taxi-ranks",
      "/api/taxi-rank",
      "/api/users",
      "/api/search",
      "/api/health",
      "/api/user-activities",
      "/api/files",
      "/api/journeys",
      "/api/analytics",
      "/api/reviews",
      "/api/locations",
      "/api/notifications",
      "/api/auth",
      "/api/devices",
      "/api/hiking-signs",
      "/api/transit-routes",
    ],
  });
});

// Handle favicon.ico requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content response
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize services and start a server
async function startServer() {
  try {
    console.log("🚀 Starting Bee-Rank API Server...");

    // Initialize a service manager with proper error handling
    const serviceManager = ServiceManager.getInstance();

    // Try to initialize services but continue even if some fail
    try {
      // Use type assertion to access the method (fix for private method issue)
      await (serviceManager as any).initialize();
      console.log("✅ Services initialized");
    } catch (serviceError) {
      console.log(
        "⚠️ Some services failed to initialize, continuing with basic functionality",
      );
      console.log("Service error:", serviceError);
    }

    // Initialize WebSocket if available
    try {
      const webSocketService = serviceManager.getService(
        "webSocket",
      ) as WebSocketService;
      if (webSocketService && webSocketService.initializeServer) {
        webSocketService.initializeServer(server);
        console.log("✅ WebSocket service initialized");
      }
    } catch (wsError) {
      console.log("⚠️ WebSocket service not available, continuing without it");
    }

    
    // Start the server
    server.listen(PORT, () => {
      console.log("🚀 Server running on port", PORT);
      console.log("📊 API available at http://localhost:" + PORT + "/api");
      console.log("🔍 Health check at http://localhost:" + PORT + "/health");
      console.log("🧪 Test endpoint at http://localhost:" + PORT + "/api/test");
      console.log(
        "📈 Taxi ranks at http://localhost:" + PORT + "/api/taxi-ranks",
      );
      console.log(
        "📊 Stats at http://localhost:" + PORT + "/api/taxi-ranks/stats",
      );
      console.log("");
      console.log("🎯 Available API Endpoints:");
      console.log("   GET  /api/taxi-ranks (or /api/ranks)");
      console.log("   POST /api/taxi-ranks");
      console.log("   GET  /api/taxi-ranks/stats");
      console.log("   GET  /api/taxi-ranks/cities");
      console.log("   GET  /api/taxi-ranks/provinces");
      console.log("   GET  /api/taxi-ranks/nearby");
      console.log("   GET  /api/users");
      console.log("   POST /api/users");
      console.log("   GET  /api/search");
      console.log("   GET  /api/health");
      console.log("   GET  /api/journeys");
      console.log("   GET  /api/hiking-signs");
      console.log("");
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}
// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`🛑 ${signal} received, shutting down gracefully`);

  try {
    const serviceManager = ServiceManager.getInstance();
    await serviceManager.shutdown();
  } catch (error) {
    console.log("⚠️ Error during service shutdown:", error);
  }

  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the server
startServer();


export default app;
