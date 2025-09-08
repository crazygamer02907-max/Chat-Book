import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import UserAvatar from "@/components/UserAvatar";
import type { PublicUser } from "@shared/schema";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
  status: z.string().max(200),
});

type ProfileData = z.infer<typeof profileSchema>;

interface ProfileModalProps {
  user: PublicUser;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ProfileModal({ user, onClose, onUpdate }: ProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user.displayName,
      status: user.status || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const response = await apiRequest("PUT", "/api/users/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/online"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="relative p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-card-foreground text-center">Profile</h2>
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 hover:bg-accent rounded-lg transition-colors"
            data-testid="button-close-profile"
          >
            <i className="fas fa-times text-muted-foreground"></i>
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="text-center">
            <div className="relative inline-block">
              <UserAvatar user={user} size="xl" showOnlineStatus={false} />
              <button className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors">
                <i className="fas fa-camera text-xs"></i>
              </button>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-card-foreground">{user.displayName}</h3>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
          </div>

          {/* Profile Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-display-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Message</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="What's on your mind?"
                        data-testid="input-status"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={onClose}
                  data-testid="button-cancel-profile"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
