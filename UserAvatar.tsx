import { cn } from "@/lib/utils";
import type { PublicUser } from "@shared/schema";

interface UserAvatarProps {
  user: PublicUser;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showOnlineStatus?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-24 h-24",
};

const statusSizeClasses = {
  sm: "w-2 h-2 -bottom-0 -right-0",
  md: "w-3 h-3 -bottom-1 -right-1",
  lg: "w-4 h-4 -bottom-1 -right-1",
  xl: "w-6 h-6 -bottom-2 -right-2",
};

export default function UserAvatar({ 
  user, 
  size = "md", 
  className,
  showOnlineStatus = true 
}: UserAvatarProps) {
  const avatarUrl = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;

  return (
    <div className={cn("relative", className)}>
      <img
        src={avatarUrl}
        alt={`${user.displayName}'s avatar`}
        className={cn(
          "rounded-full border-2 border-border object-cover",
          sizeClasses[size]
        )}
        data-testid={`avatar-${user.id}`}
      />
      {showOnlineStatus && (
        <div
          className={cn(
            "absolute rounded-full border-2 border-card",
            statusSizeClasses[size],
            user.isOnline ? "bg-success" : "bg-muted"
          )}
          data-testid={`status-${user.id}`}
        />
      )}
    </div>
  );
}
