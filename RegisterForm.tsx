import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { registerSchema, type RegisterData } from "@shared/schema";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
    },
  });

  const username = form.watch("username");
  const password = form.watch("password");

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (username && username.length >= 3) {
        try {
          const response = await fetch(`/api/auth/check-username/${username}`);
          const data = await response.json();
          setUsernameAvailable(data.available);
        } catch (error) {
          setUsernameAvailable(null);
        }
      } else {
        setUsernameAvailable(null);
      }
    };

    const debounce = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounce);
  }, [username]);

  // Password validation
  const passwordValidation = {
    minLength: password.length >= 8,
    hasUpperLower: /^(?=.*[a-z])(?=.*[A-Z])/.test(password),
  };

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome to ChatBook!",
        description: "Your account has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterData) => {
    if (usernameAvailable === false) {
      toast({
        title: "Username unavailable",
        description: "Please choose a different username",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate(data);
  };

  return (
    <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
      <h3 className="text-xl font-semibold text-card-foreground mb-6 text-center">
        Create New Account
      </h3>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter your full name"
                    data-testid="input-display-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      placeholder="Choose unique username"
                      data-testid="input-username"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {username.length >= 3 && (
                        <>
                          {usernameAvailable === true && (
                            <i className="fas fa-check text-success text-sm" data-testid="username-available"></i>
                          )}
                          {usernameAvailable === false && (
                            <i className="fas fa-times text-destructive text-sm" data-testid="username-taken"></i>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  We'll check if this username is available
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Create secure password"
                      className="pr-12"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="toggle-password"
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                  </div>
                </FormControl>
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center space-x-2 text-xs">
                      <i className={`fas ${passwordValidation.minLength ? 'fa-check text-success' : 'fa-times text-muted-foreground'}`}></i>
                      <span className="text-muted-foreground">At least 8 characters</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <i className={`fas ${passwordValidation.hasUpperLower ? 'fa-check text-success' : 'fa-times text-muted-foreground'}`}></i>
                      <span className="text-muted-foreground">Contains uppercase and lowercase</span>
                    </div>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending || usernameAvailable === false}
              data-testid="button-register"
            >
              {registerMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
            
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={onSwitchToLogin}
              data-testid="button-back-to-login"
            >
              Back to Sign In
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
