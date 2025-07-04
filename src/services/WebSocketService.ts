import type { Server as HTTPServer } from "http";
import { type Socket, Server as SocketIOServer } from "socket.io";
import { BaseService } from "./BaseService";

interface WebSocketClient extends Socket {
  userId?: string;
  subscriptions?: Set<string>;
}

export class WebSocketService extends BaseService {
  private io: SocketIOServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();

  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ WebSocketService initialized");
  }

  async shutdown(): Promise<void> {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    this.clients.clear();
    console.log("🛑 WebSocketService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return {
      status: "healthy",
      details: {
        connected_clients: this.clients.size,
        server_running: !!this.io,
      },
    };
  }

  initializeServer(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"],
      },
    });

    this.io.on("connection", (socket: WebSocketClient) => {
      console.log("Client connected:", socket.id);

      // Store client
      this.clients.set(socket.id, socket);
      socket.subscriptions = new Set();

      // Handle authentication
      socket.on("authenticate", (data: { userId: string; token: string }) => {
        // Validate token here
        socket.userId = data.userId;
        console.log(`User ${data.userId} authenticated on socket ${socket.id}`);
      });

      // Handle room subscriptions
      socket.on("subscribe", (room: string) => {
        socket.join(room);
        socket.subscriptions?.add(room);
        console.log(`Socket ${socket.id} subscribed to ${room}`);
      });

      socket.on("unsubscribe", (room: string) => {
        socket.leave(room);
        socket.subscriptions?.delete(room);
        console.log(`Socket ${socket.id} unsubscribed from ${room}`);
      });

      // Handle location updates
      socket.on(
        "location_update",
        (data: { latitude: number; longitude: number; userId: string }) => {
          // Broadcast to nearby users or specific rooms
          socket.broadcast.emit("user_location_update", {
            userId: data.userId,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: Date.now(),
          });
        },
      );

      // Handle journey updates
      socket.on(
        "journey_update",
        (data: { journeyId: string; status: string; location?: any }) => {
          // Broadcast to journey participants
          this.io
            ?.to(`journey_${data.journeyId}`)
            .emit("journey_status_update", {
              journeyId: data.journeyId,
              status: data.status,
              location: data.location,
              timestamp: Date.now(),
            });
        },
      );

      // Handle chat messages
      socket.on(
        "chat_message",
        (data: {
          journeyId: string;
          message: string;
          userId: string;
          userName: string;
        }) => {
          this.io?.to(`journey_${data.journeyId}`).emit("new_chat_message", {
            ...data,
            timestamp: Date.now(),
            socketId: socket.id,
          });
        },
      );

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        this.clients.delete(socket.id);
      });

      // Handle errors
      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });
    });

    console.log("WebSocket server initialized");
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Send to specific user
  sendToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      const userSockets = Array.from(this.clients.values()).filter(
        (client) => client.userId === userId,
      );
      userSockets.forEach((socket) => {
        socket.emit(event, data);
      });
    }
  }

  // Send to specific room
  sendToRoom(room: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }

  // Journey-specific methods
  joinJourney(socketId: string, journeyId: string): void {
    const client = this.clients.get(socketId);
    if (client) {
      client.join(`journey_${journeyId}`);
      client.subscriptions?.add(`journey_${journeyId}`);
    }
  }

  leaveJourney(socketId: string, journeyId: string): void {
    const client = this.clients.get(socketId);
    if (client) {
      client.leave(`journey_${journeyId}`);
      client.subscriptions?.delete(`journey_${journeyId}`);
    }
  }

  notifyJourneyUpdate(journeyId: string, update: any): void {
    this.sendToRoom(`journey_${journeyId}`, "journey_update", {
      journeyId,
      ...update,
      timestamp: Date.now(),
    });
  }

  // Location-based methods
  joinLocationArea(socketId: string, areaId: string): void {
    const client = this.clients.get(socketId);
    if (client) {
      client.join(`area_${areaId}`);
      client.subscriptions?.add(`area_${areaId}`);
    }
  }

  notifyAreaUpdate(areaId: string, update: any): void {
    this.sendToRoom(`area_${areaId}`, "area_update", {
      areaId,
      ...update,
      timestamp: Date.now(),
    });
  }

  // Notification methods
  sendNotification(userId: string, notification: any): void {
    this.sendToUser(userId, "notification", {
      ...notification,
      timestamp: Date.now(),
    });
  }

  // Real-time taxi rank updates
  notifyTaxiRankUpdate(rankId: string, update: any): void {
    this.sendToRoom(`taxi_rank_${rankId}`, "taxi_rank_update", {
      rankId,
      ...update,
      timestamp: Date.now(),
    });
  }

  // Route updates
  notifyRouteUpdate(routeId: string, update: any): void {
    this.sendToRoom(`route_${routeId}`, "route_update", {
      routeId,
      ...update,
      timestamp: Date.now(),
    });
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.clients.size;
  }

  // Get users in specific room
  getUsersInRoom(room: string): string[] {
    if (!this.io) return [];

    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    if (!roomSockets) return [];

    const userIds: string[] = [];
    roomSockets.forEach((socketId) => {
      const client = this.clients.get(socketId);
      if (client?.userId) {
        userIds.push(client.userId);
      }
    });

    return [...new Set(userIds)]; // Remove duplicates
  }

  // Emergency broadcast
  emergencyBroadcast(message: string, data?: any): void {
    this.broadcast("emergency_alert", {
      message,
      data,
      timestamp: Date.now(),
      type: "emergency",
    });
  }

  // Maintenance mode notification
  notifyMaintenanceMode(enabled: boolean, message?: string): void {
    this.broadcast("maintenance_mode", {
      enabled,
      message:
        message ||
        (enabled
          ? "System entering maintenance mode"
          : "System maintenance completed"),
      timestamp: Date.now(),
    });
  }

  // Server statistics
  getServerStats(): any {
    if (!this.io) {
      return {
        connected_clients: 0,
        rooms: 0,
        server_running: false,
      };
    }

    return {
      connected_clients: this.clients.size,
      rooms: this.io.sockets.adapter.rooms.size,
      server_running: true,
      namespace_count: this.io.sockets.sockets.size,
    };
  }
}
