import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './lib/AuthContext'
import { gerarBackup } from './lib/backup'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import Vendas from './pages/Vendas'
import Clientes from './pages/Clientes'
import Fornecedores from './pages/Fornecedores'
import Entradas from './pages/Entradas'
import Perdas from './pages/Perdas'
import Pedidos from './pages/Pedidos'
import { PopupProvider } from './components/PopupProvider'
import Orcamentos from './pages/Orcamentos'
import Relatorios from './pages/Relatorios'
import Backup from './pages/Backup'
import Usuarios from './pages/Usuarios'

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
        </main>
      </div>
    </div>
  )
}

function App() {
  const { sessao, loading, logout } = useAuth()

  useEffect(() => {
    if (!sessao) return
    if (!window.electronAPI) return
    gerarBackup()
    const intervalo = setInterval(() => gerarBackup(), 24 * 60 * 60 * 1000)
    return () => clearInterval(intervalo)
  }, [sessao])

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
        <Layout onLogout={logout} />
      </HashRouter>
    </PopupProvider>
  )
}

export default App