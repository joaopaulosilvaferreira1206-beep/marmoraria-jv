import { Component } from 'react'

/**
 * Captura erros de renderização e exibe fallback em vez de tela branca.
 * Envolva seções críticas: <ErrorBoundary><ComponenteComplexo /></ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
  }

  static getDerivedStateFromError(erro) {
    return { erro }
  }

  componentDidCatch(erro, info) {
    console.error('[ErrorBoundary]', erro, info.componentStack)
  }

  render() {
    if (this.state.erro) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-red-400 font-semibold mb-2">Algo deu errado nesta seção.</p>
          <p className="text-gray-500 text-sm">{this.state.erro.message}</p>
          <button
            className="mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
            onClick={() => this.setState({ erro: null })}
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
