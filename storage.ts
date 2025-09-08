import {
  users,
  messages,
  type User,
  type InsertUser,
  type Message,
  type InsertMessage,
  type PublicUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, sql, ne } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void>;
  updateUserProfile(id: string, data: Partial<Pick<User, 'displayName' | 'avatar' | 'status'>>): Promise<User>;
  getOnlineUsers(): Promise<PublicUser[]>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(userId1: string, userId2: string, limit?: number): Promise<Message[]>;
  markMessagesAsRead(senderId: string, receiverId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  
  // Chat operations
  getUserChatList(userId: string): Promise<Array<{
    user: PublicUser;
    lastMessage?: Message;
    unreadCount: number;
  }>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await db
      .update(users)
      .set({
        isOnline,
        lastSeen: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async updateUserProfile(
    id: string,
    data: Partial<Pick<User, 'displayName' | 'avatar' | 'status'>>
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getOnlineUsers(): Promise<PublicUser[]> {
    const onlineUsers = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        status: users.status,
        isOnline: users.isOnline,
        lastSeen: users.lastSeen,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.isOnline, true));
    return onlineUsers;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getMessagesBetweenUsers(
    userId1: string,
    userId2: string,
    limit: number = 50
  ): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(asc(messages.createdAt))
      .limit(limit);
  }

  async markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.senderId, senderId),
          eq(messages.receiverId, receiverId),
          eq(messages.isRead, false)
        )
      );
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false)
        )
      );
    return result.length;
  }

  async getUserChatList(userId: string): Promise<Array<{
    user: PublicUser;
    lastMessage?: Message;
    unreadCount: number;
  }>> {
    // Get all users who have exchanged messages with the current user
    const chatUsers = await db
      .selectDistinct({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        status: users.status,
        isOnline: users.isOnline,
        lastSeen: users.lastSeen,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(
        messages,
        or(
          eq(messages.senderId, users.id),
          eq(messages.receiverId, users.id)
        )
      )
      .where(
        and(
          or(
            eq(messages.senderId, userId),
            eq(messages.receiverId, userId)
          ),
          // Exclude the current user
          ne(users.id, userId)
        )
      );

    // For each chat user, get the last message and unread count
    const chatList = await Promise.all(
      chatUsers.map(async (user) => {
        // Get last message between users
        const [lastMessage] = await db
          .select()
          .from(messages)
          .where(
            or(
              and(eq(messages.senderId, userId), eq(messages.receiverId, user.id)),
              and(eq(messages.senderId, user.id), eq(messages.receiverId, userId))
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Get unread count from this user
        const unreadMessages = await db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.senderId, user.id),
              eq(messages.receiverId, userId),
              eq(messages.isRead, false)
            )
          );

        return {
          user,
          lastMessage,
          unreadCount: unreadMessages.length,
        };
      })
    );

    // Sort by last message timestamp
    return chatList.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.getTime() || 0;
      const bTime = b.lastMessage?.createdAt?.getTime() || 0;
      return bTime - aTime;
    });
  }
}


export const storage = new DatabaseStorage();
