"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/generated/prisma";

/**
 * User profile with organization membership.
 */
export interface UserWithMembership {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  membership: {
    id: string;
    role: UserRole;
    organizationId: string;
    restaurantGroupIds: string[];
    locationIds: string[];
  };
}

interface UserContextType {
  user: UserWithMembership | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
  initialUser?: UserWithMembership | null;
}

/**
 * Provides user authentication state and profile.
 */
export function UserProvider({
  children,
  initialUser = null,
}: UserProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserWithMembership | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
          return;
        }
        throw new Error("Failed to fetch user");
      }

      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      console.error("Failed to fetch user:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();

      // Also call our API to clear cookies
      await fetch("/api/auth/signout", { method: "POST" });

      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }, [router]);

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Refetch user data on sign in or token refresh
          fetchUser();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  // Fetch user on mount if no initial data
  useEffect(() => {
    if (!initialUser) {
      fetchUser();
    }
  }, [initialUser, fetchUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        role: user?.membership.role ?? null,
        signOut,
        refetch: fetchUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to access user context.
 */
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}

/**
 * Hook to check if user has minimum role.
 */
export function useHasRole(minimumRole: UserRole): boolean {
  const { role } = useUser();
  if (!role) return false;

  const hierarchy: UserRole[] = [
    "VIEWER",
    "LOCATION_MANAGER",
    "GROUP_ADMIN",
    "PARTNER_ADMIN",
    "SUPER_ADMIN",
  ];

  return hierarchy.indexOf(role) >= hierarchy.indexOf(minimumRole);
}

/**
 * Hook to check if user is an admin (GROUP_ADMIN or higher).
 */
export function useIsAdmin(): boolean {
  return useHasRole("GROUP_ADMIN");
}
