'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 [ERROR BOUNDARY] Caught error:', error);
    console.error('🔴 [ERROR BOUNDARY] Error info:', errorInfo);
    console.error('🔴 [ERROR BOUNDARY] Error stack:', error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              🔴 Error Caught - Page Will NOT Refresh
            </h1>
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <h2 className="font-semibold text-red-800 mb-2">Error Details:</h2>
              <pre className="text-sm text-red-700 overflow-auto max-h-96">
                {this.state.error?.message || 'Unknown error'}
                {'\n\n'}
                {this.state.error?.stack || 'No stack trace'}
              </pre>
            </div>
            <button
              onClick={() => {
                console.log('🔴 [ERROR BOUNDARY] Reset clicked');
                this.setState({ hasError: false, error: null });
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reset Error State
            </button>
            <p className="mt-4 text-sm text-gray-600">
              This error boundary prevents page refresh. Check console for full error details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
