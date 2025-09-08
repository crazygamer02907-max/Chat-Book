import { useAuth } from "@/hooks/useAuth";
import Chat from "@/pages/Chat";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg animate-pulse">
            <i className="fas fa-comments text-2xl text-primary-foreground"></i>
          </div>
          <p className="text-muted-foreground">Loading ChatBook...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // This will be handled by the router
  }

  return <Chat />;
}
