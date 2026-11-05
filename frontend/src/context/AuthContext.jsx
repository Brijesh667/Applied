import React, { createContext, useContext, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";
import { setUnauthorizedHandler } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        const u = await authApi.me();
        if (u) {
          try {
            localStorage.setItem("session-hint", "1");
          } catch {}
        } else {
          try {
            localStorage.removeItem("session-hint");
          } catch {}
        }
        return u;
      } catch (err) {
        if (err?.status === 401) {
          try {
            localStorage.removeItem("session-hint");
          } catch {}
          return null;
        }
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const user = data ?? null;

  // Global 401 handler for non-auth requests
  useEffect(() => {
    let isHandling = false;
    let timer = null;

    setUnauthorizedHandler(() => {
      if (isHandling) return;
      isHandling = true;
      timer = setTimeout(() => {
        isHandling = false;
      }, 2000);

      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, null);
      try {
        localStorage.removeItem("session-hint");
      } catch {}
      toast.error("Your session expired. Log in again.");
      navigate("/?auth=login", {
        state: { from: locationRef.current },
        replace: true,
      });
    });

    return () => {
      setUnauthorizedHandler(null);
      if (timer) clearTimeout(timer);
    };
  }, [queryClient, navigate]);

  const login = async (values) => {
    const res = await authApi.login(values);
    try {
      localStorage.setItem("session-hint", "1");
    } catch {}
    queryClient.clear();
    queryClient.setQueryData(queryKeys.me, res.user);
    return res.user;
  };

  const register = async (values) => {
    const res = await authApi.register(values);
    try {
      localStorage.setItem("session-hint", "1");
    } catch {}
    queryClient.clear();
    queryClient.setQueryData(queryKeys.me, res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (_err) {
      // Proceed with clearing local state even if logout request returns 401
    } finally {
      try {
        localStorage.removeItem("session-hint");
      } catch {}
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, null);
      navigate("/", { replace: true });
    }
  };

  const value = {
    user,
    isLoading,
    isError,
    refetch,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
