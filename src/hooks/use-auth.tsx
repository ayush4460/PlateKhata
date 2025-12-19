// src/hooks/use-auth.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/lib/types"; // Import your 'AdminUser' type from lib/types
import { useToast } from "./use-toast";

interface AuthContextType {
  adminUser: AdminUser | null;
  // MODIFIED: Changed signature to accept API response objects
  adminLogin: (
    user: AdminUser,
    accessToken: string,
    refreshToken?: string
  ) => Promise<boolean>;
  logout: () => void;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const safeJsonParse = <T,>(jsonString: string | null): T | null => {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse JSON from localStorage", error);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Start true on load
  const router = useRouter();
  const { toast } = useToast();

  // On initial page load, check localStorage for an existing session
  useEffect(() => {
    console.log("[AuthContext] Checking for existing session...");
    try {
      const token = localStorage.getItem("accessToken");
      const storedAdminUser = safeJsonParse<AdminUser>(
        localStorage.getItem("adminUser")
      );

      if (token && storedAdminUser) {
        console.log(
          "[AuthContext] Found existing session for:",
          storedAdminUser.email
        );
        setAdminUser(storedAdminUser); // Restore session
      } else {
        console.log("[AuthContext] No existing session found.");
        // Clear any partial data if one part is missing
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("adminUser");
      }
    } catch (error) {
      console.error("[AuthContext] Error reading localStorage", error);
      setAdminUser(null);
    } finally {
      setIsAuthLoading(false); // Finished checking
    }
  }, []); // Empty array ensures this runs only once on mount

  // --- MODIFIED: This is the new login function your login page needs ---
  const adminLogin = useCallback(
    async (
      user: AdminUser,
      accessToken: string,
      refreshToken?: string
    ): Promise<boolean> => {
      try {
        console.log("[AuthContext] adminLogin called for:", user.email);
        // 1. Store credentials in localStorage
        localStorage.setItem("accessToken", accessToken);
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
        localStorage.setItem("adminUser", JSON.stringify(user));
        if (user.restaurantId) {
          localStorage.setItem("restaurantId", String(user.restaurantId));
        }
        if (user.restaurantSlug) {
          localStorage.setItem("restaurantSlug", user.restaurantSlug);
        }

        // 2. Update the context state
        setAdminUser(user);

        return true; // <-- This signals success to the login page
      } catch (error) {
        console.error(
          "[AuthContext] Failed to save session to localStorage:",
          error
        );
        return false; // <-- This triggers the "Failed to update auth context" error
      }
    },
    []
  );
  // --- END MODIFICATION ---

  const logout = useCallback(() => {
    console.log("[AuthContext] Logout called.");
    setAdminUser(null);

    // Clear all auth-related items
    localStorage.removeItem("adminUser");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    // Also clear tableNumber, as admin is no longer associated with a table
    localStorage.removeItem("tableNumber");

    toast({ title: "Logged out successfully" });

    // Redirect to login page
    router.replace("/login");
  }, [router, toast]); // Added router and toast to dependencies

  return (
    <AuthContext.Provider
      value={{ adminUser, adminLogin, logout, isAuthLoading }}
    >
      {isAuthLoading ? (
        // Show a full-page loader while checking auth
        <div className="flex items-center justify-center h-screen bg-background">
          <p>Loading App...</p>
        </div>
      ) : (
        // Show children (your app) once auth check is complete
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
