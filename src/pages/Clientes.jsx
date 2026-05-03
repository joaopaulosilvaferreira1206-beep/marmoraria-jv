import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, X, History } from 'lucide-react'
import { usePopup } from '../components/PopupProvider'
import { exportarClientesPDF, exportarClientesExcel } from '../lib/exportar'
import { useAuth } from '../lib/AuthContext'

const clienteVazio = {
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
}

export default function Clientes() {
    const { pode } = useAuth()
    const popup = usePopup()
    const [clientes, setClientes] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(false)
    const [modalHistorico, setModalHistorico] = useState(false)
    const [clienteSelecionado, setClienteSelecionado] = useState(null)
    const [historico, setHistorico] = useState([])
    const [loadingHistorico, setLoadingHistorico] = useState(false)
    const [form, setForm] = useState(clienteVazio)
    const [editando, setEditando] = useState(null)
    const [busca, setBusca] = useState('')

    useEffect(() => {
        carregarClientes()
    }, [])

    async function carregarClientes() {
        setLoading(true)
        const { data } = await supabase.from('clientes').select('*').order('nome')
        setClientes(data || [])
        setLoading(false)
    }

    async function abrirHistorico(cliente) {
        setClienteSelecionado(cliente)
        setModalHistorico(true)
        setLoadingHistorico(true)

        const { data: vendas } = await supabase
            .from('vendas')
            .select('*, itens_venda(quantidade, valor_unitario, materiais(descricao))')
            .eq('cliente_id', cliente.id)
            .order('data', { ascending: false })

        setHistorico(vendas || [])
        setLoadingHistorico(false)
    }

    async function salvar() {
        if (!form.nome) {
            popup.showWarning('Preencha o nome do cliente!')
            return
        }

        if (editando) {
            await supabase.from('clientes').update(form).eq('id', editando)
        } else {
            await supabase.from('clientes').insert(form)
        }

        setModal(false)
        setForm(clienteVazio)
        setEditando(null)
        carregarClientes()
    }

    async function excluir(id) {
        const confirmado = await popup.confirm('Deseja excluir este cliente?')
        if (!confirmado) return
        await supabase.from('clientes').delete().eq('id', id)
        carregarClientes()
    }

    function abrirEditar(c) {
        setForm({ nome: c.nome, telefone: c.telefone || '', email: c.email || '', endereco: c.endereco || '' })
        setEditando(c.id)
        setModal(true)
    }

    const filtrados = clientes.filter(c =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (c.telefone || '').includes(busca)
    )

    const totalHistorico = historico.reduce((acc, v) => acc + (v.valor_total || 0), 0)

    return (
        <div className="space-y-4">

            <div className="flex gap-2 justify-end">
                <button
                    onClick={() => exportarClientesPDF(clientes)}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
                >
                    PDF
                </button>
                <button
                    onClick={() => exportarClientesExcel(clientes)}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                >
                    Excel
                </button>
                <button
                    onClick={() => { setForm(clienteVazio); setEditando(null); setModal(true) }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    Novo Cliente
                </button>
            </div>

            <div className="bg-gray-800 rounded-xl shadow overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-700 border-b border-gray-600">
                        <tr>
                            <th className="text-left px-4 py-3 text-gray-300">Nome</th>
                            <th className="text-left px-4 py-3 text-gray-300">Telefone</th>
                            <th className="text-left px-4 py-3 text-gray-300">Email</th>
                            <th className="text-left px-4 py-3 text-gray-300">Endereço</th>
                            <th className="text-left px-4 py-3 text-gray-300">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                        ) : filtrados.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum cliente encontrado.</td></tr>
                        ) : filtrados.map(c => (
                            <tr key={c.id} className="border-b border-gray-700 hover:bg-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-100">{c.nome}</td>
                                <td className="px-4 py-3 text-gray-400">{c.telefone || '—'}</td>
                                <td className="px-4 py-3 text-gray-400">{c.email || '—'}</td>
                                <td className="px-4 py-3 text-gray-400">{c.endereco || '—'}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <button onClick={() => abrirHistorico(c)} className="text-purple-400 hover:text-purple-300" title="Ver histórico">
                                            <History size={16} />
                                        </button>
                                        <button onClick={() => abrirEditar(c)} className="text-blue-400 hover:text-blue-300">
                                            <Pencil size={16} />
                                        </button>
                                        {pode.apagarRegistros && (
                                            <button onClick={() => excluir(c.id)} className="text-red-400 hover:text-red-300">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Histórico */}
            {modalHistorico && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-3xl max-h-screen overflow-y-auto border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-100">Histórico de Compras</h3>
                                <p className="text-sm text-gray-400">{clienteSelecionado?.nome}</p>
                            </div>
                            <button onClick={() => setModalHistorico(false)} className="text-gray-400 hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        {loadingHistorico ? (
                            <p className="text-center text-gray-400 py-8">Carregando...</p>
                        ) : historico.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">Nenhuma compra registrada.</p>
                        ) : (
                            <>
                                <div className="bg-gray-700 rounded-lg p-4 mb-4 flex justify-between">
                                    <div>
                                        <p className="text-gray-400 text-sm">Total de compras</p>
                                        <p className="text-white font-bold text-xl">{historico.length}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-400 text-sm">Valor total gasto</p>
                                        <p className="text-green-400 font-bold text-xl">
                                            R$ {totalHistorico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {historico.map(v => (
                                        <div key={v.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-gray-100 font-medium">{v.tipo_trabalho || 'Sem tipo'}</p>
                                                    <p className="text-gray-400 text-sm">{new Date(v.data).toLocaleDateString('pt-BR')} • {v.forma_pagamento || '—'}</p>
                                                </div>
                                                <p className="text-green-400 font-bold">
                                                    R$ {(v.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            {v.itens_venda && v.itens_venda.length > 0 && (
                                                <div className="border-t border-gray-600 pt-2 mt-2">
                                                    <p className="text-gray-400 text-xs mb-1">Materiais:</p>
                                                    {v.itens_venda.map((item, i) => (
                                                        <p key={i} className="text-gray-300 text-sm">
                                                            • {item.materiais?.descricao} — {item.quantidade} m² × R$ {(item.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                            {v.observacao && (
                                                <p className="text-gray-500 text-xs mt-2">Obs: {v.observacao}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Cadastro/Edição */}
            {modal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-100">{editando ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                            <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-300">Nome *</label>
                                <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                                    className="w-full border border-gray-600 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                    placeholder="Nome do cliente" autoFocus />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300">Telefone</label>
                                <input type="text" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })}
                                    className="w-full border border-gray-600 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="(91) 99999-9999" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300">Email</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full border border-gray-600 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="email@cliente.com" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300">Endereço</label>
                                <input type="text" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })}
                                    className="w-full border border-gray-600 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Rua, número, cidade..." />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setModal(false)}
                                className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-700">
                                Cancelar
                            </button>
                            <button onClick={salvar}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                                {editando ? 'Salvar Alterações' : 'Cadastrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}