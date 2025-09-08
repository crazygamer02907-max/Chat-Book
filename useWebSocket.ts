import { useEffect, useRef, useState, useCallback } from "react";
import type { Message } from "@shared/schema";

interface WebSocketMessage {
  type: 'new_message' | 'message_sent' | 'user_online' | 'user_offline' | 'typing' | 'user_status_update';
  message?: Message;
  userId?: string;
  senderId?: string;
  isTyping?: boolean;
  lastSeen?: Date;
  isOnline?: boolean;
}

export function useWebSocket(userId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate the connection
      ws.send(JSON.stringify({
        type: 'auth',
        userId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        switch (data.type) {
          case 'new_message':
          case 'message_sent':
            if (data.message) {
              setMessages(prev => [...prev, data.message!]);
            }
            break;
          case 'typing':
            if (data.senderId && data.isTyping !== undefined) {
              setTypingUsers(prev => {
                const newSet = new Set(prev);
                if (data.isTyping) {
                  newSet.add(data.senderId!);
                } else {
                  newSet.delete(data.senderId!);
                }
                return newSet;
              });
            }
            break;
          case 'user_online':
          case 'user_offline':
          case 'user_status_update':
            // Handle user status updates
            console.log(`User ${data.userId} is ${data.type === 'user_online' ? 'online' : 'offline'}`);
            // You could update local user status here
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [userId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((receiverId: string, content: string, messageType: string = "text", imageUrl?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && userId) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        data: {
          senderId: userId,
          receiverId,
          content,
          messageType,
          imageUrl,
        },
      }));
    }
  }, [userId]);

  const sendTypingIndicator = useCallback((receiverId: string, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && userId) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        senderId: userId,
        receiverId,
        isTyping,
      }));
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      connect();
      
      // Send periodic last seen updates
      const lastSeenInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'update_last_seen',
            userId,
          }));
        }
      }, 30000); // Every 30 seconds
      
      return () => {
        clearInterval(lastSeenInterval);
        disconnect();
      };
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  return {
    isConnected,
    messages,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    setMessages,
  };
}
