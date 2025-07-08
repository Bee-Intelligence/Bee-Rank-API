import { BaseService } from "../../core/base/BaseService";
import type { IBaseService } from "../../interfaces/IBaseService";
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface ConnectedClient {
  id: string;
  userId?: string;
  sessionId?: string;
  connectedAt: Date;
  lastActivity: Date;
  rooms: string[];
}

export class WebSocketService extends BaseService {
  private initialized = false;
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, ConnectedClient> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socket IDs

  constructor() {
    super('WebSocketService');
  }

  async init(): Promise<void> {
    console.log('Initializing WebSocketService');
    this.initialized = true;
  }

  initializeServer(httpServer: HttpServer): void {
    try {
      console.log('Initializing WebSocket server');
      
      this.io = new SocketIOServer(httpServer, {
        cors: {
          origin: process.env.CORS_ORIGIN || "*",
          methods: ["GET", "POST"],
          credentials: true,
        },
        transports: ['websocket', 'polling'],
      });

      this.setupEventHandlers();
      console.log('WebSocket server initialized successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log('New WebSocket connection', { socketId: socket.id });
      
      // Register client
      this.registerClient(socket);
      
      // Handle authentication
      socket.on('authenticate', (data: { userId: string; sessionId: string }) => {
        this.authenticateClient(socket, data.userId, data.sessionId);
      });
      
      // Handle joining rooms
      socket.on('join_room', (roomName: string) => {
        this.joinRoom(socket, roomName);
      });
      
      // Handle leaving rooms
      socket.on('leave_room', (roomName: string) => {
        this.leaveRoom(socket, roomName);
      });
      
      // Handle location updates
      socket.on('location_update', (data: any) => {
        this.handleLocationUpdate(socket, data);
      });
      
      // Handle taxi status updates
      socket.on('taxi_status', (data: any) => {
        this.handleTaxiStatusUpdate(socket, data);
      });
      
      // Handle journey updates
      socket.on('journey_update', (data: any) => {
        this.handleJourneyUpdate(socket, data);
      });
      
      // Handle chat messages
      socket.on('chat_message', (data: any) => {
        this.handleChatMessage(socket, data);
      });
      
      // Handle generic messages
      socket.on('message', (data: any) => {
        this.handleGenericMessage(socket, data);
      });
      
      // Handle disconnection
      socket.on('disconnect', (reason: string) => {
        console.log('WebSocket disconnection', { socketId: socket.id, reason });
        this.unregisterClient(socket.id);
      });
      
      // Update last activity on any event
      socket.onAny(() => {
        this.updateClientActivity(socket.id);
      });
    });
  }

  private registerClient(socket: Socket): void {
    const client: ConnectedClient = {
      id: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: [],
    };
    
    this.connectedClients.set(socket.id, client);
  }

  private authenticateClient(socket: Socket, userId: string, sessionId: string): void {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.userId = userId;
      client.sessionId = sessionId;
      
      // Add to user sockets map
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);
      
      // Join user-specific room
      socket.join(`user_${userId}`);
      
      console.log('Client authenticated', { socketId: socket.id, userId, sessionId });
      
      // Send authentication confirmation
      socket.emit('authenticated', { success: true, userId, sessionId });
    }
  }

  private joinRoom(socket: Socket, roomName: string): void {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      socket.join(roomName);
      client.rooms.push(roomName);
      
      console.log('Client joined room', { socketId: socket.id, room: roomName });
      socket.emit('room_joined', { room: roomName });
    }
  }

  private leaveRoom(socket: Socket, roomName: string): void {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      socket.leave(roomName);
      client.rooms = client.rooms.filter(room => room !== roomName);
      
      console.log('Client left room', { socketId: socket.id, room: roomName });
      socket.emit('room_left', { room: roomName });
    }
  }

  private handleLocationUpdate(socket: Socket, data: any): void {
    const client = this.connectedClients.get(socket.id);
    if (client && client.userId) {
      console.log('Location update received', { userId: client.userId, data });
      
      // Broadcast to relevant rooms (e.g., nearby users, taxi dispatchers)
      socket.to('location_updates').emit('user_location_update', {
        userId: client.userId,
        location: data,
        timestamp: new Date(),
      });
    }
  }

  private handleTaxiStatusUpdate(socket: Socket, data: any): void {
    const client = this.connectedClients.get(socket.id);
    if (client && client.userId) {
      console.log('Taxi status update received', { userId: client.userId, data });
      
      // Broadcast to taxi rank room
      if (data.taxiRankId) {
        socket.to(`taxi_rank_${data.taxiRankId}`).emit('taxi_status_update', {
          userId: client.userId,
          status: data,
          timestamp: new Date(),
        });
      }
    }
  }

  private handleJourneyUpdate(socket: Socket, data: any): void {
    const client = this.connectedClients.get(socket.id);
    if (client && client.userId) {
      console.log('Journey update received', { userId: client.userId, data });
      
      // Broadcast to journey participants
      if (data.journeyId) {
        socket.to(`journey_${data.journeyId}`).emit('journey_update', {
          userId: client.userId,
          update: data,
          timestamp: new Date(),
        });
      }
    }
  }

  private handleChatMessage(socket: Socket, data: any): void {
    const client = this.connectedClients.get(socket.id);
    if (client && client.userId) {
      console.log('Chat message received', { userId: client.userId, data });
      
      // Broadcast to chat room
      if (data.roomId) {
        socket.to(`chat_${data.roomId}`).emit('chat_message', {
          userId: client.userId,
          message: data.message,
          timestamp: new Date(),
        });
      }
    }
  }

  private handleGenericMessage(socket: Socket, data: any): void {
    const client = this.connectedClients.get(socket.id);
    console.log('Generic message received', { 
      socketId: socket.id, 
      userId: client?.userId, 
      data 
    });
  }

  private updateClientActivity(socketId: string): void {
    const client = this.connectedClients.get(socketId);
    if (client) {
      client.lastActivity = new Date();
    }
  }

  private unregisterClient(socketId: string): void {
    const client = this.connectedClients.get(socketId);
    if (client) {
      // Remove from user sockets map
      if (client.userId) {
        const userSockets = this.userSockets.get(client.userId);
        if (userSockets) {
          userSockets.delete(socketId);
          if (userSockets.size === 0) {
            this.userSockets.delete(client.userId);
          }
        }
      }
      
      this.connectedClients.delete(socketId);
    }
  }

  // Public methods for sending messages
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    try {
      if (!this.io) return;
      
      this.io.to(`user_${userId}`).emit(event, {
        ...data,
        timestamp: new Date(),
      });
      
      console.log('Message sent to user', { userId, event });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  async sendToRoom(roomName: string, event: string, data: any): Promise<void> {
    try {
      if (!this.io) return;
      
      this.io.to(roomName).emit(event, {
        ...data,
        timestamp: new Date(),
      });
      
      console.log('Message sent to room', { roomName, event });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  async broadcast(event: string, data: any): Promise<void> {
    try {
      if (!this.io) return;
      
      this.io.emit(event, {
        ...data,
        timestamp: new Date(),
      });
      
      console.log('Message broadcasted', { event });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  // Utility methods
  getConnectedClients(): ConnectedClient[] {
    return Array.from(this.connectedClients.values());
  }

  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  getTotalConnectionsCount(): number {
    return this.connectedClients.size;
  }

  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getUserConnections(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    return {
      status: 'healthy',
      details: {
        service: 'WebSocketService',
        initialized: this.initialized,
        serverInitialized: !!this.io,
        connectedClients: this.getTotalConnectionsCount(),
        connectedUsers: this.getConnectedUsersCount(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down WebSocketService');
    
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    
    this.connectedClients.clear();
    this.userSockets.clear();
    this.initialized = false;
  }
}