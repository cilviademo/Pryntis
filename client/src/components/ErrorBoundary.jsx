import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: '#0c0e14', color: '#e8eaf0', fontFamily: 'Inter, sans-serif',
          padding: '40px', textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Something went wrong</h1>
          <p style={{ color: '#8890a8', marginBottom: '24px', maxWidth: '480px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
