'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-red-900 font-mono text-sm overflow-auto">
          <div className="max-w-4xl w-full bg-white p-8 rounded-xl shadow-2xl border border-red-200">
            <h1 className="text-2xl font-bold mb-4 text-red-600 flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl">error</span>
                Application Crashed
            </h1>
            <p className="mb-4 text-gray-600">Please copy the error below and share it with the developer.</p>

            <div className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto mb-6">
                <p className="font-bold text-red-400 mb-2">{this.state.error?.toString()}</p>
                <pre className="text-xs opacity-75">{this.state.errorInfo?.componentStack || this.state.error?.stack}</pre>
            </div>

            <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-sans font-medium transition-colors"
            >
                Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
