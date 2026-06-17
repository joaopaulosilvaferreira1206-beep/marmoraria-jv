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

function BannerAtualizacao({ info, onFechar }) {
  const [fase, setFase] = useState('disponivel') // disponivel | baixando | pronto | erro
  const [progresso, setProgresso] = useState(0)

  async function baixarApk() {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')

    setFase('baixando')
    setProgresso(0)

    try {
      const buffer = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', info.url, true)
        xhr.responseType = 'arraybuffer'
        xhr.onprogress = (e) => {
          if (e.lengthComputable) setProgresso(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
          else reject(new Error(`HTTP ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('network error'))
        xhr.send()
      })

      const total = new Uint8Array(buffer)
      const BLOCO = 8192
      let base64 = ''
      for (let i = 0; i < total.byteLength; i += BLOCO) {
        base64 += btoa(String.fromCharCode(...total.subarray(i, i + BLOCO)))
      }

      await Filesystem.writeFile({ path: 'update.apk', directory: Directory.Cache, data: base64 })
      setFase('pronto')
    } catch {
      setFase('erro')
    }
  }

  async function instalarApk() {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { FileOpener } = await import('@capawesome-team/capacitor-file-opener')
    const { uri } = await Filesystem.getUri({ path: 'update.apk', directory: Directory.Cache })
    await FileOpener.openFile({ path: uri, mimeType: 'application/vnd.android.package-archive' })
  }

  const btnFechar = <button onClick={onFechar} className="text-blue-200 hover:text-white text-xs px-2 shrink-0">✕</button>

  if (info.plataforma === 'apk') {
    if (fase === 'erro') return (
      <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-red-600 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
        <span className="text-sm">Falha no download. Tente novamente.</span>
        <div className="flex gap-2">
          <button onClick={() => setFase('disponivel')} className="bg-white text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg">Tentar de novo</button>
          {btnFechar}
        </div>
      </div>
    )

    if (fase === 'baixando') return (
      <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-blue-700 text-white rounded-xl px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Baixando versão {info.versao}…</span>
          <span className="text-xs text-blue-200">{progresso}%</span>
        </div>
        <div className="w-full bg-blue-900 rounded-full h-2">
          <div className="bg-white rounded-full h-2 transition-all duration-200" style={{ width: `${progresso}%` }} />
        </div>
      </div>
    )

    if (fase === 'pronto') return (
      <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-green-600 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
        <span className="text-sm font-medium">Download concluído!</span>
        <div className="flex gap-2">
          <button onClick={instalarApk} className="bg-white text-green-600 text-xs font-semibold px-3 py-1.5 rounded-lg">Instalar agora</button>
          {btnFechar}
        </div>
      </div>
    )

    return (
      <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-blue-600 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
        <span className="text-sm font-medium">Nova versão {info.versao} disponível!</span>
        <div className="flex gap-2">
          <button onClick={baixarApk} className="bg-white text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg">Baixar</button>
          {btnFechar}
        </div>
      </div>
    )
  }

  if (info.fase === 'pronto') {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-green-600 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
        <span className="text-sm font-medium">Versão {info.versao} pronta para instalar!</span>
        <div className="flex gap-2">
          <button onClick={() => window.electronAPI.instalarAtualizacao()} className="bg-white text-green-600 text-xs font-semibold px-3 py-1.5 rounded-lg">
            Reiniciar e instalar
          </button>
          {btnFechar}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-blue-600 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
      <span className="text-sm font-medium">
        Baixando versão {info.versao}{info.percent !== null && info.percent !== undefined ? ` — ${info.percent}%` : '…'}
      </span>
      {btnFechar}
    </div>
  )
}

function App() {
  const { sessao, loading, logout } = useAuth()
  const [bannerAtualizacao, setBannerAtualizacao] = useState(null)

  // Remove SW legado de builds anteriores que incluíam PWA no Capacitor
  useEffect(() => {
    if (window.Capacitor?.isNativePlatform?.() && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => regs.forEach(reg => reg.unregister()))
        .catch(() => {})
    }
  }, [])

  // Limpa cache do SW ao atualizar versão — só no PWA (não no Capacitor nativo)
  useEffect(() => {
    if (window.Capacitor?.isNativePlatform?.()) return
    const chave = 'marmoraria_app_version'
    const versaoAnterior = localStorage.getItem(chave)
    localStorage.setItem(chave, __APP_VERSION__)
    if (versaoAnterior && versaoAnterior !== __APP_VERSION__) {
      if ('caches' in window) {
        caches.keys()
          .then(nomes => Promise.all(nomes.map(n => caches.delete(n))))
          .then(() => window.location.reload())
      } else {
        window.location.reload()
      }
    }
  }, [])

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
    if (window.electronAPI) return
    if (!window.Capacitor?.isNativePlatform?.()) return

    function compararVersao(a, b) {
      const pa = a.split('.').map(Number)
      const pb = b.split('.').map(Number)
      for (let i = 0; i < 3; i++) {
        if ((pa[i] || 0) > (pb[i] || 0)) return 1
        if ((pa[i] || 0) < (pb[i] || 0)) return -1
      }
      return 0
    }

    fetch(
      'https://api.github.com/repos/joaopaulosilvaferreira1206-beep/marmoraria-jv/releases/tags/latest',
      { cache: 'no-cache' }
    )
      .then(r => r.json())
      .then(release => {
        const nova = release.assets?.find(a => a.name?.endsWith('.apk'))
        if (!nova) return
        const match = nova.name.match(/v?(\d+\.\d+\.\d+)/)
        const versaoNova = match ? match[1] : ''
        if (versaoNova && compararVersao(versaoNova, __APP_VERSION__) > 0) {
          setBannerAtualizacao({ plataforma: 'apk', versao: versaoNova, url: nova.browser_download_url })
        }
      })
      .catch(() => {})
  }, [])

  // Verificação de atualização para PC (Electron via IPC)
  useEffect(() => {
    if (!window.electronAPI?.onAtualizacao) return
    window.electronAPI.onAtualizacao((status) => {
      if (status.tipo === 'disponivel') {
        // não mostra nada ainda — aguarda progresso de download
      } else if (status.tipo === 'baixando') {
        setBannerAtualizacao(prev =>
          prev ? { ...prev, percent: status.percent }
               : { plataforma: 'electron', versao: status.versao, fase: 'baixando' }
        )
      } else if (status.tipo === 'pronto') {
        setBannerAtualizacao({ plataforma: 'electron', versao: status.versao, fase: 'pronto' })
      } else if (status.tipo === 'atualizado' || status.tipo === 'erro') {
        setBannerAtualizacao(null)
      }
    })
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
        {bannerAtualizacao && (
          <BannerAtualizacao info={bannerAtualizacao} onFechar={() => setBannerAtualizacao(null)} />
        )}
        <Layout onLogout={logout} />
      </HashRouter>
    </PopupProvider>
  )
}

export default App
