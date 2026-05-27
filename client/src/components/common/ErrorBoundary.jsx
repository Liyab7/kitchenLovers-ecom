import { Component } from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

/**
 * Wraps the app so a single component's runtime error is shown clearly instead
 * of leaving the page blank. Logs full details to the console for debugging.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="card max-w-lg w-full p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-danger/10 text-danger mx-auto flex items-center justify-center text-2xl mb-4">
            <FiAlertTriangle />
          </div>
          <h1 className="text-xl font-extrabold text-ink">Something went wrong</h1>
          <p className="text-sm text-ink/60 mt-2">
            The page hit an unexpected error. Try refreshing — if it keeps happening, share the
            details below with support.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="btn-primary inline-flex items-center gap-2 mt-5"
          >
            <FiRefreshCw /> Reload page
          </button>
          {error?.message && (
            <details className="mt-5 text-left text-xs text-ink/55 bg-canvas border border-ink/10 rounded-md p-3">
              <summary className="cursor-pointer font-medium text-ink/70">Error details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{String(error.message)}</pre>
              {error?.stack && (
                <pre className="mt-2 whitespace-pre-wrap break-words opacity-70">{error.stack}</pre>
              )}
            </details>
          )}
        </div>
      </div>
    );
  }
}
