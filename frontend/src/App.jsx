/**
 * Main Application routing and providers
 * Configured with:
 * - Public Landing page at / with modal AuthDialog
 * - Preserved legacy /login and /register redirects to /?auth=login and /?auth=register
 * - Route-level code splitting via React.lazy and Suspense
 * - Top-level and per-route ErrorBoundary protection
 * - Offline / online network status monitoring
 * - Complete exclusion of dev-only Styleguide from production bundle
 */
import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProtectedRoute } from "./components/layout/ProtectedRoute.jsx";
import { AppShell } from "./components/layout/AppShell.jsx";
import { PageFallback } from "./components/layout/PageFallback.jsx";
import { ErrorBoundary } from "./components/layout/ErrorBoundary.jsx";
import { NetworkStatus } from "./components/layout/NetworkStatus.jsx";

const Landing = lazy(() => import("./pages/Landing.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Applications = lazy(() => import("./pages/Applications.jsx"));
const ApplicationForm = lazy(() => import("./pages/ApplicationForm.jsx"));
const ApplicationDetail = lazy(() => import("./pages/ApplicationDetail.jsx"));
const ApplicationReplies = lazy(() => import("./pages/ApplicationReplies.jsx"));
const Resumes = lazy(() => import("./pages/Resumes.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const Styleguide = import.meta.env.DEV
  ? lazy(() => import("./pages/Styleguide.jsx"))
  : null;

function AuthRedirect({ mode }) {
  const location = useLocation();
  return <Navigate to={`/?auth=${mode}`} state={location.state} replace />;
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NetworkStatus />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public Landing page at root */}
            <Route
              path="/"
              element={
                <ErrorBoundary>
                  <Landing />
                </ErrorBoundary>
              }
            />

            {/* Backward-compatible legacy redirects */}
            <Route path="/login" element={<AuthRedirect mode="login" />} />
            <Route path="/register" element={<AuthRedirect mode="register" />} />

            {/* Protected routes wrapped in ProtectedRoute > AppShell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route
                  path="/dashboard"
                  element={
                    <ErrorBoundary>
                      <Dashboard />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/applications"
                  element={
                    <ErrorBoundary>
                      <Applications />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/resumes"
                  element={
                    <ErrorBoundary>
                      <Resumes />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/applications/new"
                  element={
                    <ErrorBoundary>
                      <ApplicationForm />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/applications/:id"
                  element={
                    <ErrorBoundary>
                      <ApplicationDetail />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/applications/:id/replies"
                  element={
                    <ErrorBoundary>
                      <ApplicationReplies />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/applications/:id/edit"
                  element={
                    <ErrorBoundary>
                      <ApplicationForm />
                    </ErrorBoundary>
                  }
                />
              </Route>
            </Route>

            {/* Dev-only styleguide */}
            {import.meta.env.DEV && Styleguide && (
              <Route
                path="/styleguide"
                element={
                  <ErrorBoundary>
                    <Styleguide />
                  </ErrorBoundary>
                }
              />
            )}

            {/* 404 Catch-all */}
            <Route
              path="*"
              element={
                <ErrorBoundary>
                  <NotFound />
                </ErrorBoundary>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
