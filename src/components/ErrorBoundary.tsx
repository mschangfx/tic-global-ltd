'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Filter out browser extension errors and development server errors
    const isExtensionError = error.stack?.includes('inpage.js') ||
        error.stack?.includes('chrome-extension') ||
        error.stack?.includes('extension') ||
        error.message?.includes('Cannot read properties of null') ||
        error.message?.includes('reading \'type\'');

    const isDevServerError = error.stack?.includes('stack-frame') ||
        error.stack?.includes('_nextjs_original') ||
        error.message?.includes('400 (Bad Request)') ||
        error.message?.includes('Failed to load resource');

    if (isExtensionError || isDevServerError) {
      console.warn('🔇 ErrorBoundary: Extension/dev server error ignored:', error.message);
      // Don't trigger error state for extension/dev server errors
      return { hasError: false };
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log non-extension, non-dev-server errors
    const isExtensionError = error.stack?.includes('inpage.js') ||
        error.stack?.includes('chrome-extension') ||
        error.stack?.includes('extension') ||
        error.message?.includes('Cannot read properties of null');

    const isDevServerError = error.stack?.includes('stack-frame') ||
        error.stack?.includes('_nextjs_original') ||
        error.message?.includes('400 (Bad Request)');

    if (!isExtensionError && !isDevServerError) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>;
    }

    return this.props.children;
  }
}
