import { Component } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unexpected error" };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info?.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="section container">
          <div className="empty error-state" role="alert">
            <div className="empty-icon" aria-hidden="true">
              <AlertTriangle size={22} />
            </div>
            <h1>Something went wrong</h1>
            <p>
              An unexpected error occurred while rendering this page.
              {this.state.message ? (
                <>
                  {" "}
                  <code className="error-code">{this.state.message}</code>
                </>
              ) : null}
            </p>
            <div className="empty-actions">
              <button type="button" className="button" onClick={this.handleReset}>
                <RotateCcw size={16} aria-hidden />
                Try again
              </button>
              <Link className="button ghost" to="/" onClick={this.handleReset}>
                <Home size={16} aria-hidden />
                Go home
              </Link>
            </div>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
