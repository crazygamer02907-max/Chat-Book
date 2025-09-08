import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { loginSchema, registerSchema, messageSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPg from "connect-pg-simple";

interface AuthenticatedRequest extends Express.Request {
  user?: { id: string };
  body: any;
  params: any;
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// WebSocket connection tracking
const connectedUsers = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    },
  }));

  // CORS headers for better connectivity
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Authentication middleware
  const requireAuth = (req: AuthenticatedRequest, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = { id: req.session.userId };
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const user = await storage.createUser(userData);
      req.session.userId = user.id;
      
      const { password, ...publicUser } = user;
      res.json(publicUser);
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        message: error.issues ? "Validation error" : "Registration failed",
        errors: error.issues || undefined
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      await storage.updateUserOnlineStatus(user.id, true);
      
      const { password: _, ...publicUser } = user;
      res.json(publicUser);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ 
        message: error.issues ? "Validation error" : "Login failed",
        errors: error.issues || undefined
      });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user) {
        await storage.updateUserOnlineStatus(req.user.id, false);
        // Remove from connected users
        connectedUsers.delete(req.user.id);
      }
      req.session.destroy(() => {
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/user", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...publicUser } = user;
      res.json(publicUser);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.get("/api/auth/check-username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const existingUser = await storage.getUserByUsername(username);
      res.json({ available: !existingUser });
    } catch (error) {
      console.error("Username check error:", error);
      res.status(500).json({ message: "Failed to check username" });
    }
  });

  // User routes
  app.get("/api/users/online", requireAuth, async (req, res) => {
    try {
      const onlineUsers = await storage.getOnlineUsers();
      res.json(onlineUsers);
    } catch (error) {
      console.error("Get online users error:", error);
      res.status(500).json({ message: "Failed to get online users" });
    }
  });

  // Image upload endpoint
  app.post("/api/upload/image", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { imageData } = req.body;
      if (!imageData) {
        return res.status(400).json({ message: "No image data provided" });
      }
      
      // For now, we'll store as base64 data URL
      // In production, you'd upload to cloud storage
      res.json({ imageUrl: imageData });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.put("/api/users/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { displayName, avatar, status } = req.body;
      const updatedUser = await storage.updateUserProfile(req.user!.id, {
        displayName,
        avatar,
        status,
      });
      const { password, ...publicUser } = updatedUser;
      res.json(publicUser);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Chat routes
  app.get("/api/chat/conversations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const chatList = await storage.getUserChatList(req.user!.id);
      res.json(chatList);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  app.get("/api/chat/messages/:userId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const messages = await storage.getMessagesBetweenUsers(req.user!.id, userId);
      
      // Mark messages as read
      await storage.markMessagesAsRead(userId, req.user!.id);
      
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup with better configuration for connectivity
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    perMessageDeflate: false,
    maxPayload: 5 * 1024 * 1024, // 5MB for images
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'auth') {
          // Authenticate WebSocket connection
          const { userId } = message;
          if (userId) {
            connectedUsers.set(userId, ws);
            await storage.updateUserOnlineStatus(userId, true);
            
            // Broadcast user online status
            broadcastToAll({
              type: 'user_online',
              userId,
            });
          }
        } else if (message.type === 'chat_message') {
          const messageData = messageSchema.parse(message.data);
          const savedMessage = await storage.createMessage(messageData);
          
          // Send to recipient if online
          const recipientWs = connectedUsers.get(messageData.receiverId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'new_message',
              message: savedMessage,
            }));
          }
          
          // Send confirmation to sender
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'message_sent',
              message: savedMessage,
            }));
          }
        } else if (message.type === 'update_last_seen') {
          // Update last seen timestamp
          const { userId } = message;
          if (userId) {
            await storage.updateUserOnlineStatus(userId, true);
            
            // Broadcast updated status to all connected users
            broadcastToAll({
              type: 'user_status_update',
              userId,
              lastSeen: new Date(),
              isOnline: true,
            });
          }
        } else if (message.type === 'typing') {
          // Forward typing indicator
          const recipientWs = connectedUsers.get(message.receiverId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'typing',
              senderId: message.senderId,
              isTyping: message.isTyping,
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      // Find and remove user from connected users
      for (const [userId, userWs] of Array.from(connectedUsers.entries())) {
        if (userWs === ws) {
          connectedUsers.delete(userId);
          await storage.updateUserOnlineStatus(userId, false);
          
          // Broadcast user offline status
          broadcastToAll({
            type: 'user_offline',
            userId,
          });
          break;
        }
      }
    });
  });

  function broadcastToAll(message: any) {
    connectedUsers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}
