import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, CheckCircle } from 'lucide-react'
import { usePopup } from '../components/PopupProvider'
import SelectBusca from '../components/SelectBusca'
import SelectOuDigita from '../components/SelectOuDigita'

const orcamentoVazio = {
    cliente_id: '',
    data: new Date().toISOString().split('T')[0],
    validade: '',
    tipo_trabalho: '',
    observacao: '',
}

const statusCores = {
    pendente: 'bg-yellow-900/30 text-yellow-400',
    aprovado: 'bg-green-900/30 text-green-400',
    recusado: 'bg-red-900/30 text-red-400',
    convertido: 'bg-blue-900/30 text-blue-400',
}

export default function Orcamentos() {
    const popup = usePopup()
    const [orcamentos, setOrcamentos] = useState([])
    const [clientes, setClientes] = useState([])
    const [materiais, setMateriais] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(false)
    const [modalCliente, setModalCliente] = useState(false)
    const [formCliente, setFormCliente] = useState({ nome: '', telefone: '', email: '', endereco: '' })
    const [form, setForm] = useState(orcamentoVazio)
    const [itens, setItens] = useState([])
    const [itemForm, setItemForm] = useState({ material_id: '', quantidade: '', valor_unitario: '', margem: '' })

    useEffect(() => { carregarDados() }, [])

    async function carregarDados() {
        setLoading(true)
        const [{ data: o }, { data: c }, { data: m }] = await Promise.all([
            supabase.from('orcamentos').select('*, clientes(nome), itens_orcamento(quantidade, materiais(descricao))').order('criado_em', { ascending: false }),
            supabase.from('clientes').select('id, nome').order('nome'),
            supabase.from('materiais').select('id, sku, descricao, saldo, valor_medio').order('descricao'),
        ])
        setOrcamentos(o || [])
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

    const totalOrcamento = itens.reduce((acc, i) => acc + i.quantidade * i.valor_unitario, 0)

    async function salvar() {
        if (!form.cliente_id) { popup.showWarning('Selecione um cliente!'); return }
        if (itens.length === 0) { popup.showWarning('Adicione pelo menos um material!'); return }

        const { data: orc } = await supabase.from('orcamentos').insert({
            cliente_id: form.cliente_id,
            data: form.data,
            validade: form.validade || null,
            tipo_trabalho: form.tipo_trabalho,
            observacao: form.observacao,
            valor_total: totalOrcamento,
            status: 'pendente',
        }).select().single()

        if (orc) {
            await supabase.from('itens_orcamento').insert(
                itens.map(i => ({
                    orcamento_id: orc.id,
                    material_id: i.material_id,
                    quantidade: i.quantidade,
                    valor_unitario: i.valor_unitario,
                }))
            )
        }

        setModal(false)
        setForm(orcamentoVazio)
        setItens([])
        carregarDados()
    }

    async function atualizarStatus(id, status) {
        await supabase.from('orcamentos').update({ status }).eq('id', id)
        carregarDados()
    }

    async function converterEmVenda(orc) {
        const confirmado = await popup.confirm('Deseja converter este orçamento em venda?')
        if (!confirmado) return

        const { data: itensOrc } = await supabase.from('itens_orcamento').select('*').eq('orcamento_id', orc.id)

        const { data: venda } = await supabase.from('vendas').insert({
            cliente_id: orc.cliente_id,
            data: new Date().toISOString().split('T')[0],
            tipo_trabalho: orc.tipo_trabalho,
            observacao: `Convertido do orçamento #${orc.id.slice(0, 8)}`,
            valor_total: orc.valor_total,
        }).select().single()

        if (venda && itensOrc) {
            await supabase.from('itens_venda').insert(
                itensOrc.map(i => ({
                    venda_id: venda.id,
                    material_id: i.material_id,
                    quantidade: i.quantidade,
                    valor_unitario: i.valor_unitario,
                }))
            )

            for (const item of itensOrc) {
                const { data: mat } = await supabase.from('materiais').select('saldo, saidas, valor_medio').eq('id', item.material_id).single()
                if (mat) {
                    await supabase.from('materiais').update({
                        saldo: (mat.saldo || 0) - item.quantidade,
                        saidas: (mat.saidas || 0) + item.quantidade,
                    }).eq('id', item.material_id)
                }
            }

            await supabase.from('orcamentos').update({ status: 'convertido' }).eq('id', orc.id)
            popup.showSuccess('Orçamento convertido em venda com sucesso!')
            carregarDados()
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => { setForm(orcamentoVazio); setItens([]); setModal(true) }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    Novo Orçamento
                </button>
            </div>

            <div className="bg-gray-800 rounded-xl shadow overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-700 border-b border-gray-600">
                        <tr>
                            <th className="text-center px-4 py-3 text-gray-300">Data</th>
                            <th className="text-center px-4 py-3 text-gray-300">Cliente</th>
                            <th className="text-center px-4 py-3 text-gray-300">Tipo de Trabalho</th>
                            <th className="text-center px-4 py-3 text-gray-300">Materiais</th>
                            <th className="text-center px-4 py-3 text-gray-300">Qtd. Total</th>
                            <th className="text-center px-4 py-3 text-gray-300">Validade</th>
                            <th className="text-center px-4 py-3 text-gray-300">Valor Total</th>
                            <th className="text-center px-4 py-3 text-gray-300">Status</th>
                            <th className="text-center px-4 py-3 text-gray-300">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                        ) : orcamentos.length === 0 ? (
                            <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhum orçamento registrado.</td></tr>
                        ) : orcamentos.map(o => (
                            <tr key={o.id} className="border-b border-gray-700 hover:bg-gray-700">
                                <td className="px-4 py-3 text-center text-gray-400">{new Date(o.data).toLocaleDateString('pt-BR')}</td>
                                <td className="px-4 py-3 text-center text-gray-400">{o.clientes?.nome || '—'}</td>
                                <td className="px-4 py-3 text-center text-gray-400">{o.tipo_trabalho || '—'}</td>
                                <td className="px-4 py-3 text-center text-gray-400">
                                    {(o.itens_orcamento || []).length === 0 ? '—' : (
                                        <div className="flex flex-col gap-1">
                                            {o.itens_orcamento.map((item, i) => (
                                                <span key={i} className="text-xs">
                                                    {item.materiais?.descricao}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-400">
                                    {(o.itens_orcamento || []).reduce((acc, item) => acc + Number(item.quantidade || 0), 0).toLocaleString('pt-BR')} m²
                                </td>
                                <td className="px-4 py-3 text-center text-gray-400">{o.validade ? new Date(o.validade).toLocaleDateString('pt-BR') : '—'}</td>
                                <td className="px-4 py-3 text-center text-gray-400">R$ {(o.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusCores[o.status] || statusCores.pendente}`}>
                                        {o.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2 flex-wrap justify-center">
                                        {o.status === 'pendente' && (
                                            <>
                                                <button onClick={() => atualizarStatus(o.id, 'aprovado')}
                                                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                                                    Aprovar
                                                </button>
                                                <button onClick={() => atualizarStatus(o.id, 'recusado')}
                                                    className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">
                                                    Recusar
                                                </button>
                                            </>
                                        )}
                                        {o.status === 'aprovado' && (
                                            <button onClick={() => converterEmVenda(o)}
                                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center gap-1">
                                                <CheckCircle size={12} />
                                                Converter em Venda
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Novo Orçamento */}
            {modal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-100">Novo Orçamento</h3>
                            <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div className="sm:col-span-1">
                                <label className="text-sm text-gray-400">Cliente *</label>
                                <div className="mt-1 flex gap-2">
                                    <div className="flex-1 min-w-0">
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

                        <div className="mb-4">
                            <label className="text-sm text-gray-400">Observação</label>
                            <textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })}
                                rows={2} className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                        </div>

                        <div className="border-t border-gray-700 pt-4">
                            <h4 className="font-medium text-gray-300 mb-3">Materiais do Orçamento</h4>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="col-span-2">
                                    <SelectBusca
                                        opcoes={materiais}
                                        valor={itemForm.material_id}
                                        onChange={v => {
                                            const mat = materiais.find(m => m.id === v)
                                            setItemForm({ ...itemForm, material_id: v, valor_unitario: mat?.valor_medio || '', margem: '' })
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
                                                    <button onClick={() => removerItem(i)} className="text-red-400 hover:text-red-300">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="border-t border-gray-700 bg-gray-700">
                                            <td colSpan={3} className="px-3 py-2 font-bold text-right text-gray-300">Total:</td>
                                            <td colSpan={2} className="px-3 py-2 font-bold text-green-400">
                                                R$ {totalOrcamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                Salvar Orçamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Novo Cliente */}
            {modalCliente && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
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