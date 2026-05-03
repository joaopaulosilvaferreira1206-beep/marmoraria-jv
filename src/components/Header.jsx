import { useLocation } from 'react-router-dom'
import { Menu, Download } from 'lucide-react'
import { useEffect, useState } from 'react'

const titulos = {
    '/': 'Dashboard',
    '/estoque': 'Estoque',
    '/entradas': 'Entradas',
    '/vendas': 'Vendas',
    '/perdas': 'Perdas',
    '/clientes': 'Clientes',
    '/fornecedores': 'Fornecedores',
    '/pedidos': 'Pedidos',
    '/orcamentos': 'Orçamentos',
    '/relatorios': 'Relatórios',
    '/backup': 'Backup',
    '/usuarios': 'Usuários',
}

export default function Header({ onMenuClick }) {
    const location = useLocation()
    const titulo = titulos[location.pathname] || 'Marmoraria JV'
    const [promptInstalacao, setPromptInstalacao] = useState(null)
    const [podeInstalar, setPodeInstalar] = useState(false)

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault()
            setPromptInstalacao(e)
            setPodeInstalar(true)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    async function instalar() {
        if (!promptInstalacao) return
        promptInstalacao.prompt()
        const { outcome } = await promptInstalacao.userChoice
        if (outcome === 'accepted') {
            setPodeInstalar(false)
            setPromptInstalacao(null)
        }
    }

    return (
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden text-gray-400 hover:text-white transition-colors"
                >
                    <Menu size={24} />
                </button>
                <h2 className="text-xl font-semibold text-white">{titulo}</h2>
            </div>
            <div className="flex items-center gap-3">
                {podeInstalar && (
                    <button
                        onClick={instalar}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Instalar App</span>
                    </button>
                )}
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-200">Marmoraria JV</p>
                    <p className="text-xs text-gray-400">Gestão de Estoque</p>
                </div>
                <div className="w-9 h-9 rounded-full overflow-hidden">
                    <img src="/icon-192.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
            </div>
        </header>
    )
}