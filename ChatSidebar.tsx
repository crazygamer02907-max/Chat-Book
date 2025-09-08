import { useState } from "react";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/UserAvatar";
import type { PublicUser, Message } from "@shared/schema";

interface ChatData {
  user: PublicUser;
  lastMessage?: Message;
  unreadCount: number;
}

interface ChatSidebarProps {
  conversations: ChatData[];
  onlineUsers: PublicUser[];
  selectedUser: PublicUser | null;
  onUserSelect: (user: PublicUser) => void;
  currentUserId: string;
}

export default function ChatSidebar({
  conversations,
  onlineUsers,
  selectedUser,
  onUserSelect,
  currentUserId,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conversation =>
    conversation.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show all online users (including those with conversations for easier access)
  const allUsers = onlineUsers.filter(user => 
    user.id !== currentUserId &&
    (searchQuery === "" || 
     user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Show users who don't have conversations yet
  const availableUsers = allUsers.filter(user => 
    !conversations.some(conv => conv.user.id === user.id)
  );

  const formatTime = (date?: Date) => {
    if (!date) return "";
    const now = new Date();
    const messageDate = new Date(date);
    const diff = now.getTime() - messageDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm"></i>
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-users"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* Recent Conversations */}
          {filteredConversations.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Recent Chats
              </h3>
              <div className="space-y-2 mb-6">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.user.id}
                    onClick={() => onUserSelect(conversation.user)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors group ${
                      selectedUser?.id === conversation.user.id 
                        ? 'bg-accent' 
                        : 'hover:bg-accent'
                    }`}
                    data-testid={`chat-user-${conversation.user.id}`}
                  >
                    <UserAvatar user={conversation.user} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {conversation.user.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.lastMessage?.content || "No messages yet"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.lastMessage?.createdAt || undefined)}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <div className="w-2 h-2 bg-primary rounded-full" data-testid={`unread-indicator-${conversation.user.id}`}></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Online Users */}
          {availableUsers.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Available Friends
              </h3>
              <div className="space-y-2">
                {availableUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => onUserSelect(user)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors group ${
                      selectedUser?.id === user.id 
                        ? 'bg-accent' 
                        : 'hover:bg-accent'
                    }`}
                    data-testid={`online-user-${user.id}`}
                  >
                    <UserAvatar user={user} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.status || "Online"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* All Online Users for easy access */}
          {searchQuery && allUsers.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-6">
                All Online Friends
              </h3>
              <div className="space-y-2">
                {allUsers.map((user) => (
                  <div
                    key={`all-${user.id}`}
                    onClick={() => onUserSelect(user)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors group ${
                      selectedUser?.id === user.id 
                        ? 'bg-accent' 
                        : 'hover:bg-accent'
                    }`}
                    data-testid={`search-user-${user.id}`}
                  >
                    <UserAvatar user={user} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.status || "Available for chat"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Empty State */}
          {filteredConversations.length === 0 && availableUsers.length === 0 && !searchQuery && (
            <div className="text-center py-8">
              <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
              <p className="text-sm text-muted-foreground">
                No friends online yet
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Friends will appear here when they come online
              </p>
            </div>
          )}
          
          {searchQuery && filteredConversations.length === 0 && allUsers.length === 0 && (
            <div className="text-center py-8">
              <i className="fas fa-search text-4xl text-muted-foreground mb-4"></i>
              <p className="text-sm text-muted-foreground">
                No users found matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
