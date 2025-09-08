import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import ChatSidebar from "@/components/ChatSidebar";
import MessageArea from "@/components/MessageArea";
import ProfileModal from "@/components/ProfileModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { PublicUser, Message } from "@shared/schema";

interface ChatData {
  user: PublicUser;
  lastMessage?: Message;
  unreadCount: number;
}

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { 
    isConnected, 
    messages, 
    typingUsers, 
    sendMessage, 
    sendTypingIndicator,
    setMessages
  } = useWebSocket(user?.id);

  // Get chat conversations
  const { data: conversations = [], refetch: refetchConversations } = useQuery<ChatData[]>({
    queryKey: ["/api/chat/conversations"],
    enabled: !!user,
  });

  // Get online users
  const { data: onlineUsers = [] } = useQuery<PublicUser[]>({
    queryKey: ["/api/users/online"],
    enabled: !!user,
    refetchInterval: 5000, // Refresh every 5 seconds for more live updates
  });

  // Get messages for selected user
  const { data: chatMessages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/chat/messages", selectedUser?.id],
    enabled: !!selectedUser,
  });

  // Update messages when new ones arrive via WebSocket
  useEffect(() => {
    if (chatMessages.length > 0) {
      setMessages(chatMessages);
    }
  }, [chatMessages, setMessages]);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      queryClient.clear();
      window.location.reload();
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "You have been logged out.",
          variant: "destructive",
        });
        window.location.reload();
        return;
      }
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = (content: string, messageType: string = "text", imageUrl?: string) => {
    if (selectedUser && user) {
      sendMessage(selectedUser.id, content, messageType, imageUrl);
    }
  };

  const handleUserSelect = (chatUser: PublicUser) => {
    setSelectedUser(chatUser);
    // Refresh messages when selecting a user
    if (chatUser.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", chatUser.id] });
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (selectedUser) {
      sendTypingIndicator(selectedUser.id, isTyping);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-comments text-primary-foreground text-sm"></i>
              </div>
              <h1 className="text-xl font-bold text-foreground">ChatBook</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
              <span className="text-sm text-muted-foreground">
                {onlineUsers.length} online
              </span>
            </div>
            
            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 hover:bg-accent rounded-lg px-3 py-2 transition-colors"
                data-testid="user-menu-button"
              >
                <img 
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                  alt="User Avatar" 
                  className="w-8 h-8 rounded-full" 
                />
                <span className="text-sm font-medium">{user.displayName}</span>
                <i className="fas fa-chevron-down text-xs text-muted-foreground"></i>
              </button>
              
              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-50">
                  <div className="py-2">
                    <button 
                      onClick={() => {
                        setShowProfile(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center space-x-2"
                      data-testid="view-profile-button"
                    >
                      <i className="fas fa-user text-muted-foreground"></i>
                      <span>View Profile</span>
                    </button>
                    <hr className="my-2 border-border" />
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent text-destructive flex items-center space-x-2"
                      data-testid="logout-button"
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)] chat-container">
        <ChatSidebar
          conversations={conversations}
          onlineUsers={onlineUsers}
          selectedUser={selectedUser}
          onUserSelect={handleUserSelect}
          currentUserId={user.id}
        />
        
        <MessageArea
          selectedUser={selectedUser}
          messages={messages}
          typingUsers={typingUsers}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          currentUserId={user.id}
        />
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            setShowProfile(false);
          }}
        />
      )}

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
}
