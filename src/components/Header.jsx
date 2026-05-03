import { useLocation } from 'react-router-dom'

const titulos = {
    '/': 'Dashboard',
    '/estoque': 'Estoque',
    '/entradas': 'Entradas',
    '/vendas': 'Vendas',
    '/perdas': 'Perdas',
    '/clientes': 'Clientes',
    '/fornecedores': 'Fornecedores',
    '/pedidos': 'Pedidos',
}

export default function Header() {
    const location = useLocation()
    const titulo = titulos[location.pathname] || 'Marmoraria JV'

    return (
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">{titulo}</h2>
            <div className="flex items-center gap-3">
                <div className="text-right">
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