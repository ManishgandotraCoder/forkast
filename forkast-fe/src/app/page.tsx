'use client';

import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Portfolio from "@/components/trading/Portfolio";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if user wants to trade
  const goToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
                <p className="mt-2 text-gray-600">Here&apos;s your crypto portfolio overview</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={goToDashboard}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Go to Trading
                </button>
              </div>
            </div>
          </div>

          {/* Portfolio Component */}
          <Portfolio />
        </div>
      </div>
    </WebSocketProvider>
  );
}
