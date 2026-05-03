import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2 } from 'lucide-react'
import { usePopup } from '../components/PopupProvider'
import { emitirEstoqueAtualizado } from '../lib/estoqueEvents'
import { useAuth } from '../lib/AuthContext'
import SelectBusca from '../components/SelectBusca'
import SelectOuDigita from '../components/SelectOuDigita'

const vendaVazia = {
    cliente_id: '',
    data: new Date().toISOString().split('T')[0],
    tipo_trabalho: '',
    forma_pagamento: '',
    observacao: '',
}

export default function Vendas() {
    const { pode } = useAuth()
    const popup = usePopup()
    const [vendas, setVendas] = useState([])
    const [quantidadePorVenda, setQuantidadePorVenda] = useState({})
    const [clientes, setClientes] = useState([])
    const [materiais, setMateriais] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(false)
    const [modalCliente, setModalCliente] = useState(false)
    const [formCliente, setFormCliente] = useState({ nome: '', telefone: '', email: '', endereco: '' })
    const [form, setForm] = useState(vendaVazia)
    const [itens, setItens] = useState([])
    const [itemForm, setItemForm] = useState({ material_id: '', quantidade: '', valor_unitario: '', margem: '' })

    useEffect(() => { carregarDados() }, [])

    async function carregarDados() {
        setLoading(true)
        const [{ data: v }, { data: c }, { data: m }, { data: iv }] = await Promise.all([
            supabase.from('vendas').select('*, clientes(nome)').order('data', { ascending: false }),
            supabase.from('clientes').select('id, nome').order('nome'),
            supabase.from('materiais').select('id, sku, descricao, saldo, valor_medio, saidas, valor_total').order('descricao'),
            supabase.from('itens_venda').select('venda_id, quantidade'),
        ])

        const totais = (iv || []).reduce((acc, item) => {
            acc[item.venda_id] = (acc[item.venda_id] || 0) + Number(item.quantidade || 0)
            return acc
        }, {})

        setVendas(v || [])
        setQuantidadePorVenda(totais)
        setClientes(c || [])
        setMateriais(m || [])
        setLoading(false)
    }

    async function cadastrarCliente() {
        if (!formCliente.nome) {
            await popup.showWarning('Preencha o nome do cliente!')
            return
        }

        const { data: novoCliente, error } = await supabase.from('clientes').insert({
            nome: formCliente.nome,
            telefone: formCliente.telefone || null,
            email: formCliente.email || null,
            endereco: formCliente.endereco || null,
        }).select().single()

        if (error || !novoCliente?.id) {
            await popup.showError('Erro ao cadastrar cliente. Tente novamente.')
            return
        }

        await carregarDados()
        setForm(f => ({ ...f, cliente_id: novoCliente.id }))
        setModalCliente(false)
        setFormCliente({ nome: '', telefone: '', email: '', endereco: '' })
        popup.showSuccess(`Cliente "${formCliente.nome}" cadastrado com sucesso!`)
    }

    function adicionarItem() {
        if (!itemForm.material_id || !itemForm.quantidade) {
            popup.showWarning('Selecione o material e a quantidade!')
            return
        }
        const mat = materiais.find(m => m.id === itemForm.material_id)
        if (Number(itemForm.quantidade) > (mat?.saldo || 0)) {
            popup.showWarning(`Saldo insuficiente!\nDisponível: ${mat?.saldo || 0} m²`)
            return
        }
        setItens([...itens, {
            material_id: itemForm.material_id,
            descricao: mat?.descricao || '',
            quantidade: Number(itemForm.quantidade),
            valor_unitario: Number(itemForm.valor_unitario) || mat?.valor_medio || 0,
        }])
        setItemForm({ material_id: '', quantidade: '', valor_unitario: '', margem: '' })
    }

    function removerItem(index) {
        setItens(itens.filter((_, i) => i !== index))
    }

    const totalVenda = itens.reduce((acc, i) => acc + i.quantidade * i.valor_unitario, 0)

    async function salvar() {
        if (!form.cliente_id) { await popup.showWarning('Selecione um cliente!'); return }
        if (itens.length === 0) { await popup.showWarning('Adicione pelo menos um material!'); return }

        for (const item of itens) {
            const mat = materiais.find(m => m.id === item.material_id)
            if (mat && item.quantidade > mat.saldo) {
                await popup.showWarning(`Saldo insuficiente para "${mat.descricao}"!\nDisponível: ${mat.saldo} m²\nSolicitado: ${item.quantidade} m²`)
                return
            }
        }

        const { data: venda } = await supabase.from('vendas').insert({
            cliente_id: form.cliente_id,
            data: form.data,
            tipo_trabalho: form.tipo_trabalho,
            forma_pagamento: form.forma_pagamento,
            observacao: form.observacao,
            valor_total: totalVenda,
        }).select().single()

        if (venda) {
            await supabase.from('itens_venda').insert(
                itens.map(i => ({
                    venda_id: venda.id,
                    material_id: i.material_id,
                    quantidade: i.quantidade,
                    valor_unitario: i.valor_unitario,
                }))
            )

            const qtdPorMaterial = itens.reduce((acc, item) => {
                acc[item.material_id] = (acc[item.material_id] || 0) + Number(item.quantidade || 0)
                return acc
            }, {})

            for (const materialId of Object.keys(qtdPorMaterial)) {
                const qtd = qtdPorMaterial[materialId]
                const { data: matAtual } = await supabase.from('materiais').select('saldo, saidas, valor_medio').eq('id', materialId).single()
                if (!matAtual) continue
                const novoSaldo = (matAtual.saldo || 0) - qtd
                await supabase.from('materiais').update({
                    saldo: novoSaldo,
                    saidas: (matAtual.saidas || 0) + qtd,
                    valor_total: (matAtual.valor_medio || 0) * novoSaldo,
                }).eq('id', materialId)
            }

            emitirEstoqueAtualizado()
        }

        setModal(false)
        setForm(vendaVazia)
        setItens([])
        carregarDados()
    }

    function formatarDataHora(registro) {
        const valor = registro.criado_em || registro.data
        if (!valor) return '—'
        const valorUTC = valor.endsWith('Z') ? valor : valor + 'Z'
        return new Date(valorUTC).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => { setForm(vendaVazia); setItens([]); setModal(true) }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    Nova Venda
                </button>
            </div>

            <div className="bg-gray-800 rounded-xl shadow overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-700 border-b border-gray-600">
                        <tr>
                            <th className="text-left px-4 py-3 text-gray-300">Data/Hora</th>
                            <th className="text-left px-4 py-3 text-gray-300">Cliente</th>
                            <th className="text-left px-4 py-3 text-gray-300">Tipo de Trabalho</th>
                            <th className="text-left px-4 py-3 text-gray-300">Qtd. Material</th>
                            <th className="text-left px-4 py-3 text-gray-300">Pagamento</th>
                            <th className="text-left px-4 py-3 text-gray-300">Valor Total</th>
                            <th className="text-left px-4 py-3 text-gray-300">Observação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                        ) : vendas.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma venda registrada.</td></tr>
                        ) : vendas.map(v => (
                            <tr key={v.id} className="border-b border-gray-700 hover:bg-gray-700">
                                <td className="px-4 py-3 text-gray-400">{formatarDataHora(v)}</td>
                                <td className="px-4 py-3 font-medium text-white">{v.clientes?.nome || '—'}</td>
                                <td className="px-4 py-3 text-gray-400">{v.tipo_trabalho || '—'}</td>
                                <td className="px-4 py-3 text-blue-400 font-bold">{(quantidadePorVenda[v.id] || 0).toLocaleString('pt-BR')} m²</td>
                                <td className="px-4 py-3 text-gray-400">{v.forma_pagamento || '—'}</td>
                                <td className="px-4 py-3 text-green-400 font-bold">R$ {(v.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 text-gray-400">{v.observacao || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Nova Venda */}
            {modal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-100">Nova Venda</h3>
                            <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="text-sm text-gray-400">Cliente *</label>
                                <div className="mt-1 flex gap-2">
                                    <div className="flex-1">
                                        <SelectBusca
                                            opcoes={clientes}
                                            valor={form.cliente_id}
                                            onChange={v => setForm({ ...form, cliente_id: v })}
                                            placeholder="Selecione o cliente..."
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setModalCliente(true)}
                                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg border border-gray-600 text-sm transition-colors shrink-0"
                                        title="Cadastrar novo cliente"
                                    >
                                        + Novo
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Data</label>
                                <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Tipo de Trabalho</label>
                                <div className="mt-1">
                                    <SelectOuDigita
                                        opcoes={['Bancada', 'Pia', 'Piso', 'Escada', 'Soleira', 'Peitoril', 'Outro']}
                                        valor={form.tipo_trabalho}
                                        onChange={v => setForm({ ...form, tipo_trabalho: v })}
                                        placeholder="Selecione ou digite..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Forma de Pagamento</label>
                                <div className="mt-1">
                                    <SelectOuDigita
                                        opcoes={['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'A prazo']}
                                        valor={form.forma_pagamento}
                                        onChange={v => setForm({ ...form, forma_pagamento: v })}
                                        placeholder="Selecione ou digite..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-gray-400">Observação</label>
                            <textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })}
                                rows={2} className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                        </div>

                        <div className="mt-4 border-t border-gray-700 pt-4">
                            <h4 className="font-medium text-gray-300 mb-3">Materiais da Venda</h4>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="col-span-2">
                                    <SelectBusca
                                        opcoes={materiais}
                                        valor={itemForm.material_id}
                                        onChange={v => {
                                            const mat = materiais.find(m => m.id === v)
                                            setItemForm({ ...itemForm, material_id: v, valor_unitario: mat?.valor_medio || '', margem: 0 })
                                        }}
                                        placeholder="Buscar por nome ou SKU..."
                                        campoLabel="descricao"
                                        campoSecundario="sku"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400">Quantidade (m²)</label>
                                    <input type="number" placeholder="0" value={itemForm.quantidade}
                                        onChange={e => setItemForm({ ...itemForm, quantidade: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400">Margem de lucro (%)</label>
                                    <input type="number" placeholder="0" value={itemForm.margem || ''}
                                        onChange={e => {
                                            const margem = Number(e.target.value)
                                            const mat = materiais.find(m => m.id === itemForm.material_id)
                                            const custo = mat?.valor_medio || 0
                                            setItemForm({ ...itemForm, margem: e.target.value, valor_unitario: (custo * (1 + margem / 100)).toFixed(2) })
                                        }}
                                        className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400">Custo unit. (R$)</label>
                                    <input type="number" readOnly
                                        value={materiais.find(m => m.id === itemForm.material_id)?.valor_medio || ''}
                                        className="w-full bg-gray-700 border border-gray-600 text-gray-400 rounded-lg px-3 py-2 mt-1 opacity-50 cursor-not-allowed" />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400">Preço de venda (R$)</label>
                                    <input type="number" placeholder="0.00" value={itemForm.valor_unitario}
                                        onChange={e => setItemForm({ ...itemForm, valor_unitario: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            {itemForm.material_id && itemForm.quantidade && itemForm.valor_unitario && (
                                <div className="bg-gray-700 rounded-lg px-3 py-2 mb-2 text-sm flex justify-between">
                                    <span className="text-gray-300">Subtotal:</span>
                                    <span className="text-green-400 font-bold">
                                        R$ {(Number(itemForm.quantidade) * Number(itemForm.valor_unitario)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            <button onClick={adicionarItem}
                                className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg mb-3 transition-colors">
                                + Adicionar item
                            </button>

                            {itens.length > 0 && (
                                <table className="w-full text-sm border border-gray-700 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-700">
                                        <tr>
                                            <th className="text-left px-3 py-2 text-gray-300">Material</th>
                                            <th className="text-left px-3 py-2 text-gray-300">Qtd</th>
                                            <th className="text-left px-3 py-2 text-gray-300">Valor Unit.</th>
                                            <th className="text-left px-3 py-2 text-gray-300">Subtotal</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itens.map((item, i) => (
                                            <tr key={i} className="border-t border-gray-700">
                                                <td className="px-3 py-2 text-gray-200">{item.descricao}</td>
                                                <td className="px-3 py-2 text-gray-200">{item.quantidade} m²</td>
                                                <td className="px-3 py-2 text-gray-200">R$ {item.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-3 py-2 font-medium text-gray-200">R$ {(item.quantidade * item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-3 py-2">
                                                    {pode.apagarRegistros && (
                                                        <button onClick={() => removerItem(i)} className="text-red-400 hover:text-red-300">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="border-t border-gray-700 bg-gray-700">
                                            <td colSpan={3} className="px-3 py-2 font-bold text-right text-gray-300">Total:</td>
                                            <td colSpan={2} className="px-3 py-2 font-bold text-green-400">
                                                R$ {totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setModal(false)}
                                className="flex-1 border border-gray-600 text-gray-400 py-2 rounded-lg hover:bg-gray-700 transition">
                                Cancelar
                            </button>
                            <button onClick={salvar}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                                Registrar Venda
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Novo Cliente */}
            {modalCliente && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-100">Novo Cliente</h3>
                            <button onClick={() => { setModalCliente(false); setFormCliente({ nome: '', telefone: '', email: '', endereco: '' }) }} className="text-gray-400 hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-400">Nome *</label>
                                <input type="text" value={formCliente.nome}
                                    onChange={e => setFormCliente({ ...formCliente, nome: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                    placeholder="Nome do cliente" autoFocus />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Telefone</label>
                                <input type="text" value={formCliente.telefone}
                                    onChange={e => setFormCliente({ ...formCliente, telefone: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                    placeholder="(91) 99999-9999" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">E-mail</label>
                                <input type="email" value={formCliente.email}
                                    onChange={e => setFormCliente({ ...formCliente, email: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                    placeholder="email@cliente.com" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Endereço</label>
                                <input type="text" value={formCliente.endereco}
                                    onChange={e => setFormCliente({ ...formCliente, endereco: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                    placeholder="Rua, número, cidade..." />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setModalCliente(false); setFormCliente({ nome: '', telefone: '', email: '', endereco: '' }) }}
                                className="flex-1 border border-gray-600 text-gray-400 py-2 rounded-lg hover:bg-gray-700 transition">
                                Cancelar
                            </button>
                            <button onClick={cadastrarCliente}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                                Cadastrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}