import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; message?: string }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: '#0A0A0A',
            color: '#ff6b6b',
            padding: '16px',
            fontFamily: 'monospace',
          }}
        >
          UI 崩溃：{this.state.message ?? '未知错误'}
        </div>
      )
    }
    return this.props.children
  }
}

