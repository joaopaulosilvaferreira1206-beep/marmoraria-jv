import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportarVendasPDF, exportarVendasExcel } from '../lib/exportar'
import { usePopup } from '../components/PopupProvider'
import { Search, TrendingUp, ShoppingCart, Package, DollarSign } from 'lucide-react'

export default function Relatorios() {
    const popup = usePopup()
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')
    const [loading, setLoading] = useState(false)
    const [relatorio, setRelatorio] = useState(null)

    async function gerarRelatorio() {
        if (!dataInicio || !dataFim) {
            popup.showWarning('Selecione o período!')
            return
        }

        setLoading(true)

        const { data: vendas } = await supabase
            .from('vendas')
            .select('*, clientes(nome), itens_venda(quantidade, valor_unitario, materiais(descricao))')
            .gte('data', dataInicio)
            .lte('data', dataFim)
            .order('data', { ascending: false })

        const { data: entradas } = await supabase
            .from('entradas')
            .select('*, materiais(descricao)')
            .gte('data', dataInicio)
            .lte('data', dataFim)

        const { data: perdas } = await supabase
            .from('perdas')
            .select('*, materiais(descricao)')
            .gte('data', dataInicio)
            .lte('data', dataFim)

        const totalVendas = (vendas || []).reduce((acc, v) => acc + (v.valor_total || 0), 0)
        const totalEntradas = (entradas || []).reduce((acc, e) => acc + ((e.custo || 0) * e.quantidade), 0)
        const totalPerdas = (perdas || []).reduce((acc, p) => acc + (p.quantidade || 0), 0)

        const vendasPorCliente = (vendas || []).reduce((acc, v) => {
            const nome = v.clientes?.nome || 'Sem cliente'
            if (!acc[nome]) acc[nome] = { total: 0, quantidade: 0 }
            acc[nome].total += v.valor_total || 0
            acc[nome].quantidade += 1
            return acc
        }, {})

        const materiaisVendidos = {}
            ; (vendas || []).forEach(v => {
                (v.itens_venda || []).forEach(item => {
                    const nome = item.materiais?.descricao || 'Desconhecido'
                    if (!materiaisVendidos[nome]) materiaisVendidos[nome] = { quantidade: 0, valor: 0 }
                    materiaisVendidos[nome].quantidade += item.quantidade || 0
                    materiaisVendidos[nome].valor += (item.quantidade || 0) * (item.valor_unitario || 0)
                })
            })

        setRelatorio({
            vendas: vendas || [],
            totalVendas,
            totalEntradas,
            totalPerdas,
            vendasPorCliente,
            materiaisVendidos,
        })

        setLoading(false)
    }

    return (
        
        <div className="space-y-6">
            {/* Filtro de período */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-gray-100 font-semibold mb-4">Selecione o Período</h3>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div>
                        <label className="text-sm text-gray-300">Data Início</label>
                        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                            className="w-full border border-gray-600 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-300">Data Fim</label>
                        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                            className="w-full border border-gray-600 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button
                        onClick={gerarRelatorio}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        <Search size={18} />
                        {loading ? 'Gerando...' : 'Gerar Relatório'}
                    </button>

                    {relatorio && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => exportarVendasPDF(relatorio.vendas, `Período: ${dataInicio} a ${dataFim}`)}
                                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
                            >
                                Exportar PDF
                            </button>
                            <button
                                onClick={() => exportarVendasExcel(relatorio.vendas)}
                                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                            >
                                Exportar Excel
                            </button>
                        </div>
                    )}
                </div>

                {relatorio && (
                    <>
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex items-center gap-4">
                                <div className="bg-green-600 p-3 rounded-lg">
                                    <DollarSign size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Total em Vendas</p>
                                    <p className="text-white font-bold text-lg">
                                        R$ {relatorio.totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex items-center gap-4">
                                <div className="bg-blue-600 p-3 rounded-lg">
                                    <ShoppingCart size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Nº de Vendas</p>
                                    <p className="text-white font-bold text-lg">{relatorio.vendas.length}</p>
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex items-center gap-4">
                                <div className="bg-yellow-600 p-3 rounded-lg">
                                    <Package size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Custo de Entradas</p>
                                    <p className="text-white font-bold text-lg">
                                        R$ {relatorio.totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex items-center gap-4">
                                <div className="bg-red-600 p-3 rounded-lg">
                                    <TrendingUp size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Perdas (m²)</p>
                                    <p className="text-white font-bold text-lg">{relatorio.totalPerdas.toFixed(2)} m²</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Vendas por cliente */}
                            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                                <h3 className="text-gray-100 font-semibold mb-4">Vendas por Cliente</h3>
                                {Object.keys(relatorio.vendasPorCliente).length === 0 ? (
                                    <p className="text-gray-400 text-sm">Nenhuma venda no período.</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-600">
                                                <th className="text-left py-2 text-gray-300">Cliente</th>
                                                <th className="text-left py-2 text-gray-300">Compras</th>
                                                <th className="text-left py-2 text-gray-300">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(relatorio.vendasPorCliente)
                                                .sort((a, b) => b[1].total - a[1].total)
                                                .map(([nome, dados]) => (
                                                    <tr key={nome} className="border-b border-gray-700">
                                                        <td className="py-2 text-gray-200">{nome}</td>
                                                        <td className="py-2 text-gray-400">{dados.quantidade}</td>
                                                        <td className="py-2 text-green-400 font-medium">
                                                            R$ {dados.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Materiais mais vendidos */}
                            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                                <h3 className="text-gray-100 font-semibold mb-4">Materiais Mais Vendidos</h3>
                                {Object.keys(relatorio.materiaisVendidos).length === 0 ? (
                                    <p className="text-gray-400 text-sm">Nenhum material vendido no período.</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-600">
                                                <th className="text-left py-2 text-gray-300">Material</th>
                                                <th className="text-left py-2 text-gray-300">Qtd (m²)</th>
                                                <th className="text-left py-2 text-gray-300">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(relatorio.materiaisVendidos)
                                                .sort((a, b) => b[1].valor - a[1].valor)
                                                .map(([nome, dados]) => (
                                                    <tr key={nome} className="border-b border-gray-700">
                                                        <td className="py-2 text-gray-200">{nome}</td>
                                                        <td className="py-2 text-blue-400">{dados.quantidade.toFixed(2)}</td>
                                                        <td className="py-2 text-green-400 font-medium">
                                                            R$ {dados.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Lista de vendas */}
                        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                            <h3 className="text-gray-100 font-semibold mb-4">Todas as Vendas do Período</h3>
                            {relatorio.vendas.length === 0 ? (
                                <p className="text-gray-400 text-sm">Nenhuma venda no período.</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-600">
                                            <th className="text-left py-2 text-gray-300">Data</th>
                                            <th className="text-left py-2 text-gray-300">Cliente</th>
                                            <th className="text-left py-2 text-gray-300">Tipo</th>
                                            <th className="text-left py-2 text-gray-300">Pagamento</th>
                                            <th className="text-left py-2 text-gray-300">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {relatorio.vendas.map(v => (
                                            <tr key={v.id} className="border-b border-gray-700 hover:bg-gray-700">
                                                <td className="py-2 text-gray-400">{new Date(v.data).toLocaleDateString('pt-BR')}</td>
                                                <td className="py-2 text-gray-200">{v.clientes?.nome || '—'}</td>
                                                <td className="py-2 text-gray-400">{v.tipo_trabalho || '—'}</td>
                                                <td className="py-2 text-gray-400">{v.forma_pagamento || '—'}</td>
                                                <td className="py-2 text-green-400 font-bold">
                                                    R$ {(v.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}