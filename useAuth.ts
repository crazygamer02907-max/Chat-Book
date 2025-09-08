import { useQuery } from "@tanstack/react-query";
import type { PublicUser } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<PublicUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
