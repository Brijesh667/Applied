import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { Logo } from "../ui/Logo.jsx";
import { Spinner } from "../ui/Spinner.jsx";
import { ErrorState } from "../ui/ErrorState.jsx";

export function ProtectedRoute() {
  const { user, isLoading, isError, refetch } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 p-6">
        <Logo size="lg" />
        <Spinner size="md" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6">
        <ErrorState
          title="Connection error"
          message="Can't reach the server. Check your connection and try again."
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/?auth=login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
