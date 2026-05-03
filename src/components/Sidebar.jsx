import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { onEstoqueAtualizado } from '../lib/estoqueEvents'
import { useAuth } from '../lib/AuthContext'
import {
    LayoutDashboard, Package, ShoppingCart, Users,
    Truck, ArrowDownCircle, AlertTriangle, ClipboardList,
    LogOut, FileText, BarChart2, DatabaseBackup,
    UserCog, Shield, User
} from 'lucide-react'

export default function Sidebar({ onLogout }) {
    const [estoqueBaixo, setEstoqueBaixo] = useState(0)
    const { pode, perfil } = useAuth()

    const menu = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/estoque', icon: Package, label: 'Estoque', badge: estoqueBaixo },
        { path: '/entradas', icon: ArrowDownCircle, label: 'Entradas' },
        { path: '/vendas', icon: ShoppingCart, label: 'Vendas' },
        { path: '/perdas', icon: AlertTriangle, label: 'Perdas' },
        { path: '/clientes', icon: Users, label: 'Clientes' },
        { path: '/fornecedores', icon: Truck, label: 'Fornecedores' },
        { path: '/orcamentos', icon: FileText, label: 'Orçamentos' },
        { path: '/pedidos', icon: ClipboardList, label: 'Pedidos' },
        pode.verRelatorios && { path: '/relatorios', icon: BarChart2, label: 'Relatórios' },
        pode.acessarBackup && { path: '/backup', icon: DatabaseBackup, label: 'Backup' },
        pode.gerenciarUsuarios && { path: '/usuarios', icon: UserCog, label: 'Usuários' },
    ].filter(Boolean)

    useEffect(() => {
        verificarEstoque()
        const interval = setInterval(verificarEstoque, 1000)
        const remover = onEstoqueAtualizado(verificarEstoque)
        return () => {
            clearInterval(interval)
            remover()
        }
    }, [])

    async function verificarEstoque() {
        const { data } = await supabase
            .from('materiais')
            .select('saldo, minimo')
        if (data) {
            const baixo = data.filter(m => m.minimo && m.saldo <= m.minimo).length
            setEstoqueBaixo(baixo)
        }
    }

    const badges = { estoqueBaixo }

    return (
        <div className="w-64 bg-gray-900 text-white flex flex-col border-r border-gray-700/50">
            <div className="p-6 border-b border-gray-700">
                <h1 className="text-xl font-bold">💎 Marmoraria JV</h1>
                <p className="text-gray-400 text-sm mt-1">Gestão de Estoque</p>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                {menu.map(({ path, icon: Icon, label, badge }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end={path === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`
                        }
                    >
                        <Icon size={20} />
                        <span className="flex-1">{label}</span>
                        {badge && badges[badge] > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {badges[badge]}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-700">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-600 hover:text-white transition-colors"
                >
                    <LogOut size={20} />
                    <span>Sair</span>
                </button>
            </div>
        </div>
    )
}