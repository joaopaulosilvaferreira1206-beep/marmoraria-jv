import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

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
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-200">Marmoraria JV</p>
                    <p className="text-xs text-gray-400">Gestão de Estoque</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    M
                </div>
            </div>
        </header>
    )
}