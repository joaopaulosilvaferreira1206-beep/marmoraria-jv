import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { onEstoqueAtualizado } from '../lib/estoqueEvents'
import { useAuth } from '../lib/AuthContext'
import logo from '/icon-192.png'
import {
    LayoutDashboard, Package, ShoppingCart, Users,
    Truck, ArrowDownCircle, AlertTriangle, ClipboardList,
    LogOut, FileText, BarChart2, DatabaseBackup,
    UserCog, Shield, User, X
} from 'lucide-react'

export default function Sidebar({ onLogout, aberta, onFechar }) {
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
        const interval = setInterval(verificarEstoque, 5000)
        const remover = onEstoqueAtualizado(verificarEstoque)

        const canal = supabase.channel('sidebar-estoque')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'materiais' }, verificarEstoque)
            .subscribe()

        return () => {
            clearInterval(interval)
            remover()
            supabase.removeChannel(canal)
        }
    }, [])

    async function verificarEstoque() {
        const { data } = await supabase.from('materiais').select('saldo, minimo')
        if (data) {
            const baixo = data.filter(m => m.minimo && m.saldo <= m.minimo).length
            setEstoqueBaixo(baixo)
        }
    }

    return (
        <>
            {/* Overlay mobile */}
            {aberta && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={onFechar}
                />
            )}

            {/* Sidebar */}
            <div className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-gray-900 text-white flex flex-col border-r border-gray-700/50
        transform transition-transform duration-300 ease-in-out
        ${aberta ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
`}>
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                            <h1 className="text-xl font-bold">Marmoraria JV</h1>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Gestão de Estoque</p>
                    </div>
                    <button
                        onClick={onFechar}
                        className="lg:hidden text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menu.map(({ path, icon: Icon, label, badge }) => (
                        <NavLink
                            key={path}
                            to={path}
                            end={path === '/'}
                            onClick={onFechar}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`
                            }
                        >
                            <Icon size={20} />
                            <span className="flex-1">{label}</span>
                            {badge > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {badge}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Info do usuário */}
                <div className="px-4 py-3 border-t border-gray-700">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className={`p-1.5 rounded-full ${perfil?.perfil === 'admin' ? 'bg-blue-600/20' : 'bg-gray-700'}`}>
                            {perfil?.perfil === 'admin'
                                ? <Shield size={14} className="text-blue-400" />
                                : <User size={14} className="text-gray-400" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-gray-200 text-sm font-medium truncate">{perfil?.nome}</p>
                            <p className="text-gray-500 text-xs capitalize">{perfil?.perfil}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-600 hover:text-white transition-colors mt-1"
                    >
                        <LogOut size={20} />
                        <span>Sair</span>
                    </button>
                </div>
            </div>
        </>
    )
}