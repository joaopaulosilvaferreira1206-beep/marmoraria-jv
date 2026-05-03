import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Package, AlertTriangle, TrendingDown, ShoppingCart } from 'lucide-react'

export default function Dashboard() {
    const [resumo, setResumo] = useState({
        totalMateriais: 0,
        valorEstoque: 0,
        estoqueBaixo: 0,
        perdasMes: 0,
    })
    const [alertas, setAlertas] = useState([])
    const [vendasRecentes, setVendasRecentes] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { carregarDados() }, [])

    async function carregarDados() {
        setLoading(true)
        const { data: materiais } = await supabase.from('materiais').select('*')
        const { data: perdas } = await supabase
            .from('perdas').select('quantidade')
            .gte('data', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        const { data: vendas } = await supabase
            .from('vendas').select('*, clientes(nome)')
            .order('criado_em', { ascending: false }).limit(5)

        if (materiais) {
            const estoqueBaixo = materiais.filter(m => m.minimo && m.saldo <= m.minimo)
            setResumo({
                totalMateriais: materiais.length,
                valorEstoque: materiais.reduce((acc, m) => acc + (m.valor_total || 0), 0),
                estoqueBaixo: estoqueBaixo.length,
                perdasMes: perdas?.reduce((acc, p) => acc + (p.quantidade || 0), 0) || 0,
            })
            setAlertas(estoqueBaixo.slice(0, 5))
        }

        if (vendas) setVendasRecentes(vendas)
        setLoading(false)
    }

    const cards = [
        { label: 'Total de Materiais', valor: resumo.totalMateriais, icon: Package, cor: 'bg-blue-500' },
        { label: 'Valor em Estoque', valor: `R$ ${resumo.valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: ShoppingCart, cor: 'bg-green-500' },
        { label: 'Estoque Baixo', valor: resumo.estoqueBaixo, icon: AlertTriangle, cor: 'bg-yellow-500' },
        { label: 'Perdas no Mês (m²)', valor: resumo.perdasMes.toFixed(2), icon: TrendingDown, cor: 'bg-red-500' },
    ]

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-gray-400">Carregando...</p>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map(({ label, valor, icon: Icon, cor }) => (
                    <div key={label} className="bg-gray-800 rounded-xl shadow p-5 flex items-center gap-4 border border-gray-700">
                        <div className={`${cor} p-3 rounded-lg text-white`}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">{label}</p>
                            <p className="text-xl font-bold text-white">{valor}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-xl shadow p-5 border border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-yellow-500" />
                        Alertas de Estoque Baixo
                    </h3>
                    {alertas.length === 0 ? (
                        <p className="text-gray-400 text-sm">Nenhum alerta no momento ✅</p>
                    ) : (
                        <div className="rounded-xl overflow-hidden border border-gray-700">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="text-left px-4 py-2 text-gray-300">Material</th>
                                        <th className="text-left px-4 py-2 text-gray-300">Saldo</th>
                                        <th className="text-left px-4 py-2 text-gray-300">Mínimo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertas.map(m => (
                                        <tr key={m.id} className="border-t border-gray-700">
                                            <td className="px-4 py-2 font-medium text-gray-100">{m.descricao}</td>
                                            <td className="px-4 py-2 text-red-400 font-bold">{m.saldo} m²</td>
                                            <td className="px-4 py-2 text-gray-400">{m.minimo} m²</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="bg-gray-800 rounded-xl shadow p-5 border border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                        <ShoppingCart size={20} className="text-blue-500" />
                        Vendas Recentes
                    </h3>
                    {vendasRecentes.length === 0 ? (
                        <p className="text-gray-400 text-sm">Nenhuma venda registrada ainda.</p>
                    ) : (
                        <div className="rounded-xl overflow-hidden border border-gray-700">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="text-left px-4 py-2 text-gray-300">Cliente</th>
                                        <th className="text-left px-4 py-2 text-gray-300">Tipo</th>
                                        <th className="text-left px-4 py-2 text-gray-300">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vendasRecentes.map(v => (
                                        <tr key={v.id} className="border-t border-gray-700">
                                            <td className="px-4 py-2 font-medium text-gray-100">{v.clientes?.nome || '—'}</td>
                                            <td className="px-4 py-2 text-gray-400">{v.tipo_trabalho || '—'}</td>
                                            <td className="px-4 py-2 text-green-400 font-bold">
                                                R$ {(v.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}