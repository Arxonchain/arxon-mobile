import { Component, ErrorInfo, ReactNode } from "react";
import AppFailureScreen from "./AppFailureScreen";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <AppFailureScreen
          failureType="unknown"
          onPrimary={this.handleRetry}
          devError={this.state.error}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
