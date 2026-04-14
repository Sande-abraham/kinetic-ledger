import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    const state = this.state as ErrorBoundaryState;
    if (state.hasError) {
      let message = 'Something went wrong.';
      try {
        const errInfo = JSON.parse(state.error?.message || '');
        if (errInfo.error) {
          message = `Firestore Error: ${errInfo.error} during ${errInfo.operationType} on ${errInfo.path}`;
        }
      } catch {
        message = state.error?.message || message;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-error mb-4">Oops!</h2>
            <p className="text-on-surface-variant mb-6">{message}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
