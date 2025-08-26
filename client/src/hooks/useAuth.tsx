import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "../lib/queryClient";

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem("auth-token");
    if (token) {
      // Validate token by making a request
      fetch("/api/system/stats", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(response => {
          if (response.ok) {
            // Token is valid, decode user info from token
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              setUser({
                id: payload.userId,
                email: payload.email,
                role: 'user' // Default role
              });
            } catch (error) {
              localStorage.removeItem("auth-token");
            }
          } else {
            localStorage.removeItem("auth-token");
          }
        })
        .catch(() => {
          localStorage.removeItem("auth-token");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await response.json();
    
    localStorage.setItem("auth-token", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("auth-token");
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
