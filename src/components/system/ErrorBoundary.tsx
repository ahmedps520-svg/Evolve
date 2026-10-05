import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';

interface Props {
  children: ReactNode;
  /** Compact in-page variant instead of a full-screen message. */
  inline?: boolean;
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/** Friendly failure screen. Raw errors never reach the player; their data is untouched. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Evolve UI error', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={this.props.inline ? 'grid place-items-center py-16' : 'grid min-h-dvh place-items-center bg-bg p-6'} role="alert">
        <div className="max-w-sm text-center">
          <Logo size={44} className="mx-auto opacity-80" />
          <h1 className="mt-5 font-display text-xl font-semibold tracking-wide text-fg">Something went wrong.</h1>
          <p className="mt-2 text-sm text-muted">Your progress is safe. Try again.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => this.setState({ error: null })} className="h-11 rounded-xl bg-accent-fill px-5 font-display text-sm font-semibold tracking-[0.1em] text-accent-fg uppercase">
              Try again
            </button>
            <button type="button" onClick={() => location.reload()} className="h-11 rounded-xl border border-line bg-surface-3 px-5 text-sm font-semibold text-fg">
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
