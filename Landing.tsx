import { useState } from "react";
import LoginForm from "@/components/LoginForm";
import RegisterForm from "@/components/RegisterForm";

export default function Landing() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="w-full max-w-md">
        {/* ChatBook Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <i className="fas fa-comments text-2xl text-primary-foreground"></i>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">ChatBook</h1>
          <p className="text-muted-foreground text-sm">
            meet with your friends and connect to get better chat
          </p>
        </div>

        {/* Forms */}
        {showRegister ? (
          <RegisterForm onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <LoginForm onSwitchToRegister={() => setShowRegister(true)} />
        )}
      </div>
    </div>
  );
}
