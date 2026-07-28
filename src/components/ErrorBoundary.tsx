import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  // Explicit declaration for strict TS compilation
  public declare props: Props;
  public declare state: State;
  public declare setState: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught component error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 max-w-2xl mx-auto bg-rose-50 border border-rose-200 rounded-3xl text-rose-900 shadow-md flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-3 bg-rose-100 rounded-full text-rose-600">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h3 className="text-sm font-black text-rose-950 uppercase tracking-wider">
              {this.props.fallbackTitle || 'Admin Portal Component Error'}
            </h3>
            <p className="text-xs text-rose-700 font-semibold mt-1 leading-relaxed">
              {this.state.error?.message || 'An unhandled rendering error occurred in this view.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Reload Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
