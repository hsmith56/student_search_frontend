"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { clearClientCache } from "@/lib/client-cache";
import { ApiError } from "@/lib/api/api-client";
import {
  getCurrentUser,
  loginWithPassword,
  logoutUser,
  registerUser,
} from "@/lib/api/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    first_name: string,
    username: string,
    password: string,
    signup_code: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const data = await getCurrentUser({ redirectOnUnauthorized: false });
      setIsAuthenticated(true);
      setUsername(data.username ?? null);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setIsAuthenticated(false);
        setUsername(null);
        return false;
      }

      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      setUsername(null);
      return false;
    }
  };

  useEffect(() => {
    const initialCheck = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    initialCheck();
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await loginWithPassword(username, password);
      clearClientCache();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const authVerified = await checkAuth();

      if (authVerified) {
        posthog.identify(username, { username });
        posthog.capture("user_signed_in", { username });
        return { success: true };
      }

      return {
        success: false,
        error:
          "Login succeeded but session cookie is not working. Your backend needs to set cookies with SameSite=None and Secure=True, and use HTTPS (try ngrok).",
      };
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof ApiError && error.message.trim()) {
        return { success: false, error: error.message };
      }
      return {
        success: false,
        error:
          "Cannot connect to backend at /api. Make sure NEXT_PUBLIC_API_URL is set to your ngrok or deployed backend URL.",
      };
    }
  };

  const register = async (
    first_name: string,
    username: string,
    password: string,
    signup_code: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await registerUser({
        username,
        password,
        first_name,
        signup_code,
      });
      posthog.identify(username, { username, first_name });
      posthog.capture("user_signed_up", { username, first_name });
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof ApiError && error.message.trim()) {
        return { success: false, error: error.message };
      }
      return {
        success: false,
        error:
          "Cannot connect to backend at /api. Make sure NEXT_PUBLIC_API_URL is set to your ngrok or deployed backend URL.",
      };
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      posthog.capture("user_signed_out");
      posthog.reset();
      clearClientCache();
      setIsAuthenticated(false);
      setUsername(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, username, login, register, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
