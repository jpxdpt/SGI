import React from 'react';

type ErrorBoundaryState = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-sm text-red-600 dark:text-red-400">
          <h2 className="text-lg font-semibold mb-2">Ocorreu um erro ao carregar esta secção.</h2>
          <p className="mb-2">{this.state.error?.message}</p>
          <p>Verifique os dados ou recarregue a página.</p>
        </div>
      );
    }
    return this.props.children;
  }
}


