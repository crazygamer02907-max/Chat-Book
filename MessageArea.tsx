import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, Camera, Video, Mic } from "lucide-react";
import type { PublicUser, Message } from "@shared/schema";

interface MessageAreaProps {
  selectedUser: PublicUser | null;
  messages: Message[];
  typingUsers: Set<string>;
  onSendMessage: (content: string, messageType?: string, imageUrl?: string) => void;
  onTyping: (isTyping: boolean) => void;
  currentUserId: string;
}

export default function MessageArea({
  selectedUser,
  messages,
  typingUsers,
  onSendMessage,
  onTyping,
  currentUserId,
}: MessageAreaProps) {
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing indicators
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      onTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTyping(false);
      }, 2000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, onTyping]);

  const handleSendMessage = () => {
    if (messageContent.trim() && selectedUser) {
      onSendMessage(messageContent.trim(), "text");
      setMessageContent("");
      setIsTyping(false);
      onTyping(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUser) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        
        try {
          const response = await apiRequest("POST", "/api/upload/image", { imageData });
          const { imageUrl } = await response.json();
          
          onSendMessage("📷 Image", "image", imageUrl);
          toast({
            title: "Image sent",
            description: "Your image has been sent successfully",
          });
        } catch (error) {
          toast({
            title: "Upload failed",
            description: "Failed to send image. Please try again.",
            variant: "destructive",
          });
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (value: string) => {
    setMessageContent(value);
    if (value.trim() && !isTyping) {
      setIsTyping(true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      onTyping(false);
    }
  };

  const formatMessageTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <i className="fas fa-comments text-6xl text-muted-foreground mb-4"></i>
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Select a friend to start chatting
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose someone from your friends list to begin a conversation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <UserAvatar user={selectedUser} size="lg" />
          <div>
            <h2 className="text-lg font-semibold text-card-foreground" data-testid={`chat-header-${selectedUser.id}`}>
              {selectedUser.displayName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedUser.isOnline ? (
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Active now</span>
                </span>
              ) : (
                selectedUser.lastSeen ? `Last seen ${formatMessageTime(selectedUser.lastSeen)}` : "Offline"
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" data-testid="button-voice-call">
            <i className="fas fa-phone text-muted-foreground"></i>
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-video-call">
            <i className="fas fa-video text-muted-foreground"></i>
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="messages-container">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <UserAvatar user={selectedUser} size="xl" className="mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Start a conversation with {selectedUser.displayName}
            </h3>
            <p className="text-sm text-muted-foreground">
              Send a message to begin chatting
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === currentUserId;
            
            return (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${isOwnMessage ? 'justify-end' : ''}`}
                data-testid={`message-${message.id}`}
              >
                {!isOwnMessage && (
                  <UserAvatar user={selectedUser} size="sm" />
                )}
                
                <div className={`flex-1 flex flex-col ${isOwnMessage ? 'items-end' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-md ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                    }`}
                  >
                    {message.messageType === 'image' && message.imageUrl ? (
                      <div className="space-y-2">
                        <img 
                          src={message.imageUrl} 
                          alt="Shared image" 
                          className="max-w-64 max-h-64 rounded-lg object-cover cursor-pointer"
                          onClick={() => message.imageUrl && window.open(message.imageUrl, '_blank')}
                        />
                        <p className="text-xs opacity-75">{message.content}</p>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatMessageTime(message.createdAt!)}
                    </span>
                    {isOwnMessage && (
                      <i className={`fas fa-check-double text-xs ${message.isRead ? 'text-primary' : 'text-muted-foreground'}`}></i>
                    )}
                  </div>
                </div>
                
                {isOwnMessage && (
                  <UserAvatar user={{ ...selectedUser, id: currentUserId }} size="sm" />
                )}
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typingUsers.has(selectedUser.id) && (
          <div className="flex items-start space-x-3" data-testid="typing-indicator">
            <UserAvatar user={selectedUser} size="sm" />
            <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Mobile Optimized */}
      <div className="bg-card border-t border-border px-3 py-3">
        <div className="flex items-end space-x-2">
          {/* Media Upload Buttons */}
          <div className="flex space-x-1">
            {/* Image Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 h-10 w-10 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 border-0 chat-mobile-button media-button"
              data-testid="button-attach-image"
              title="Send Image"
            >
              {isUploading ? (
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              ) : (
                <Camera className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </Button>
            
            {/* Video Upload */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => alert('Video messages coming soon! 🎥')}
              className="p-2 h-10 w-10 rounded-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 border-0 chat-mobile-button media-button"
              data-testid="button-attach-video"
              title="Send Video"
            >
              <Video className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </Button>
            
            {/* Voice Message */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => alert('Voice messages coming soon! 🎤')}
              className="p-2 h-10 w-10 rounded-full bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 border-0 chat-mobile-button media-button"
              data-testid="button-voice-message"
              title="Voice Message"
            >
              <Mic className="h-5 w-5 text-green-600 dark:text-green-400" />
            </Button>
          </div>
          
          {/* Message Input Area */}
          <div className="flex-1 flex items-end space-x-2">
            <div className="flex-1 relative">
              <Textarea
                placeholder="Type your message..."
                value={messageContent}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="resize-none min-h-[44px] max-h-32 text-base leading-5 rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 px-4 py-3 pr-4 chat-mobile-input"
                rows={1}
                data-testid="textarea-message"
              />
            </div>
            
            {/* Send Button with Text */}
            <Button
              onClick={handleSendMessage}
              disabled={!messageContent.trim()}
              className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-0 chat-mobile-button mobile-send-button"
              data-testid="button-send-message"
            >
              <div className="flex items-center space-x-2">
                <Send className="h-4 w-4" />
                <span className="text-sm font-bold">Send</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
