import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Something went wrong</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                An unexpected error occurred. Please try refreshing the page.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/20 transition-all flex items-center gap-2 mx-auto cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
