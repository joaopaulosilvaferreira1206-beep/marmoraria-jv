import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { useAuth } from './lib/AuthContext'
import { gerarBackup } from './lib/backup'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Login from './pages/Login'
import { PopupProvider } from './components/PopupProvider'
import { sincronizar } from './lib/offlineSync'

// Lazy load: cada página vira chunk separado — só baixa quando o usuário navega
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Estoque      = lazy(() => import('./pages/Estoque'))
const Vendas       = lazy(() => import('./pages/Vendas'))
const Clientes     = lazy(() => import('./pages/Clientes'))
const Fornecedores = lazy(() => import('./pages/Fornecedores'))
const Entradas     = lazy(() => import('./pages/Entradas'))
const Perdas       = lazy(() => import('./pages/Perdas'))
const Pedidos      = lazy(() => import('./pages/Pedidos'))
const Orcamentos   = lazy(() => import('./pages/Orcamentos'))
const Relatorios   = lazy(() => import('./pages/Relatorios'))
const Backup       = lazy(() => import('./pages/Backup'))
const Usuarios     = lazy(() => import('./pages/Usuarios'))

function PageLoader() {
  return (
    <div className="flex flex-col gap-3 p-2 animate-pulse">
      <div className="h-10 bg-gray-700 rounded-xl w-1/3" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-12 bg-gray-700/60 rounded-xl" />
      ))}
    </div>
  )
}

function AcessoNegado() {
  const navigate = useNavigate()
  useEffect(() => { const t = setTimeout(() => navigate('/'), 2500); return () => clearTimeout(t) }, [navigate])
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div className="text-5xl">🔒</div>
      <h2 className="text-xl font-semibold text-gray-100">Acesso restrito</h2>
      <p className="text-gray-400 text-sm">Você não tem permissão para acessar esta página.<br/>Redirecionando para o Dashboard…</p>
    </div>
  )
}

function Layout({ onLogout }) {
  const { pode } = useAuth()
  const [sidebarAberta, setSidebarAberta] = useState(false)

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      <Sidebar
        onLogout={onLogout}
        aberta={sidebarAberta}
        onFechar={() => setSidebarAberta(false)}
      />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenuClick={() => setSidebarAberta(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-900">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/entradas" element={<Entradas />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/perdas" element={<Perdas />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/fornecedores" element={<Fornecedores />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/relatorios" element={
                pode.verRelatorios ? <Relatorios /> : <AcessoNegado />
              } />
              <Route path="/backup" element={
                pode.acessarBackup ? <Backup /> : <AcessoNegado />
              } />
              <Route path="/usuarios" element={
                pode.gerenciarUsuarios ? <Usuarios /> : <AcessoNegado />
              } />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function App() {
  const { sessao, loading, logout } = useAuth()
  const [atualizacaoApk, setAtualizacaoApk] = useState(null)

  useEffect(() => {
    if (!sessao) return
    if (!window.electronAPI) return
    gerarBackup()
    const intervalo = setInterval(() => gerarBackup(), 24 * 60 * 60 * 1000)
    return () => clearInterval(intervalo)
  }, [sessao])

  // Sincroniza fila offline sempre que recuperar conexão
  useEffect(() => {
    window.addEventListener('online', sincronizar)
    sincronizar()
    return () => window.removeEventListener('online', sincronizar)
  }, [])

  // Verificação de atualização para Android (APK sideloaded)
  useEffect(() => {
    if (window.electronAPI) return // Electron tem auto-update nativo
    fetch('https://api.github.com/repos/joaopaulosilvaferreira1206-beep/marmoraria-jv/releases/tags/latest')
      .then(r => r.json())
      .then(release => {
        const nova = release.assets?.find(a => a.name?.endsWith('.apk'))
        if (!nova) return
        const versaoNova = release.tag_name?.replace(/^v/, '') || ''
        const versaoAtual = __APP_VERSION__
        if (versaoNova && versaoNova !== versaoAtual) {
          setAtualizacaoApk({ versao: versaoNova, url: nova.browser_download_url })
        }
      })
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-lg">Carregando...</p>
      </div>
    )
  }

  if (!sessao) return <Login />

  return (
    <PopupProvider>
      <HashRouter>
        {atualizacaoApk && (
          <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-blue-600 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
            <span className="text-sm font-medium">Nova versão {atualizacaoApk.versao} disponível!</span>
            <div className="flex gap-2">
              <a
                href={atualizacaoApk.url}
                target="_blank"
                rel="noreferrer"
                className="bg-white text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                Baixar APK
              </a>
              <button
                onClick={() => setAtualizacaoApk(null)}
                className="text-blue-200 hover:text-white text-xs px-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <Layout onLogout={logout} />
      </HashRouter>
    </PopupProvider>
  )
}

export default App
