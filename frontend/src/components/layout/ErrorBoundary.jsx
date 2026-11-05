/**
 * ErrorBoundary component
 * Catches JavaScript errors in child component tree and renders an ErrorState fallback
 * with a "Reload page" action.
 * Logs error to console only in development mode.
 */
import React from "react";
import { ErrorState } from "../ui/ErrorState.jsx";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-paper text-ink">
          <ErrorState
            headingTag="h1"
            title="Something went wrong"
            message="Reload the page and try again."
            onRetry={this.handleReload}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;