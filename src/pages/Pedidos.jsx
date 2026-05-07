import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2 } from 'lucide-react'
import { usePopup } from '../components/PopupProvider'
import { emitirEstoqueAtualizado } from '../lib/estoqueEvents'
import SelectBusca from '../components/SelectBusca'

const pedidoVazio = {
    fornecedor_id: '',
    data: new Date().toISOString().split('T')[0],
    status: 'Pendente',
    observacao: '',
    tempo_entrega: '',
}

export default function Pedidos() {
    const navigate = useNavigate()
    const popup = usePopup()
    const [pedidos, setPedidos] = useState([])
    const [quantidadePorPedido, setQuantidadePorPedido] = useState({})
    const [fornecedores, setFornecedores] = useState([])
    const [materiais, setMateriais] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(false)
    const [modalFornecedor, setModalFornecedor] = useState(false)
    const [formFornecedor, setFormFornecedor] = useState({ nome: '', telefone: '', email: '', endereco: '' })
    const [form, setForm] = useState(pedidoVazio)
    const [itens, setItens] = useState([])
    const [itemForm, setItemForm] = useState({ material_id: '', quantidade: '' })

    useEffect(() => {
        carregarDados()
        const canal = supabase.channel('pedidos-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, carregarDados)
            .subscribe()
        return () => supabase.removeChannel(canal)
    }, [])

    async function carregarDados() {
        setLoading(true)
        const [{ data: ped, error: pedError }, { data: forn, error: fornError }, { data: mat, error: matError }] = await Promise.all([
            supabase.from('pedidos').select('*, fornecedores(nome), itens_pedido(quantidade, materiais(descricao))').order('data', { ascending: false }),
            supabase.from('fornecedores').select('id, nome').order('nome'),
            supabase.from('materiais').select('id, sku, descricao, unidade').order('descricao'),
        ])
        if (pedError || fornError || matError) await popup.showError('Erro ao carregar dados de pedidos.')

        const totais = (ped || []).reduce((acc, pedido) => {
            acc[pedido.id] = (pedido.itens_pedido || []).reduce((soma, item) => soma + Number(item.quantidade || 0), 0)
            return acc
        }, {})

        setPedidos(ped || [])
        setQuantidadePorPedido(totais)
        setFornecedores(forn || [])
        setMateriais(mat || [])
        setLoading(false)
    }

    async function cadastrarFornecedor() {
        if (!formFornecedor.nome) {
            await popup.showWarning('Preencha o nome do fornecedor!')
            return
        }

        const { data: novoFornecedor, error } = await supabase.from('fornecedores').insert({
            nome: formFornecedor.nome,
            telefone: formFornecedor.telefone || null,
            email: formFornecedor.email || null,
            endereco: formFornecedor.endereco || null,
        }).select().single()

        if (error || !novoFornecedor?.id) {
            await popup.showError('Erro ao cadastrar fornecedor. Tente novamente.')
            return
        }

        await carregarDados()
        setForm(f => ({ ...f, fornecedor_id: novoFornecedor.id }))
        setModalFornecedor(false)
        setFormFornecedor({ nome: '', telefone: '', email: '', endereco: '' })
        popup.showSuccess(`Fornecedor "${formFornecedor.nome}" cadastrado com sucesso!`)
    }

    async function adicionarItem() {
        if (!itemForm.material_id || !itemForm.quantidade) {
            await popup.showWarning('Selecione o material e a quantidade!')
            return
        }
        const material = materiais.find(m => m.id === itemForm.material_id)
        const quantidade = Number(itemForm.quantidade)
        if (!material || quantidade <= 0) { await popup.showWarning('Item inválido.'); return }

        const indexExistente = itens.findIndex(i => i.material_id === itemForm.material_id)
        if (indexExistente >= 0) {
            const atualizados = [...itens]
            atualizados[indexExistente].quantidade += quantidade
            setItens(atualizados)
        } else {
            setItens([...itens, {
                material_id: material.id,
                descricao: material.descricao,
                unidade: material.unidade || 'm²',
                quantidade,
            }])
        }
        setItemForm({ material_id: '', quantidade: '' })
    }

    function removerItem(index) {
        setItens(itens.filter((_, i) => i !== index))
    }

    async function salvar() {
        if (!form.fornecedor_id) { await popup.showWarning('Selecione um fornecedor!'); return }
        if (itens.length === 0) { await popup.showWarning('Adicione pelo menos um item no pedido!'); return }

        const { data: pedido, error: pedidoError } = await supabase.from('pedidos').insert({
            fornecedor_id: form.fornecedor_id,
            data: form.data,
            status: form.status,
            observacao: form.observacao,
            tempo_entrega: form.tempo_entrega || null,
        }).select().single()

        if (pedidoError || !pedido) { await popup.showError('Erro ao registrar pedido.'); return }

        const { error: itensError } = await supabase.from('itens_pedido').insert(
            itens.map(i => ({ pedido_id: pedido.id, material_id: i.material_id, quantidade: i.quantidade }))
        )
        if (itensError) { await popup.showWarning('Pedido criado, mas houve erro ao salvar os itens.'); return }

        setModal(false)
        setForm(pedidoVazio)
        setItens([])
        setItemForm({ material_id: '', quantidade: '' })
        carregarDados()
    }

    async function alterarStatus(pedido, novoStatus) {
        if (novoStatus === 'Recebido' && pedido.status === 'Recebido') {
            await popup.showInfo('Este pedido já foi recebido e lançado no estoque.')
            return
        }

        if (novoStatus === 'Recebido') {
            const { data: itensPedido, error: itensError } = await supabase
                .from('itens_pedido').select('material_id, quantidade').eq('pedido_id', pedido.id)
            if (itensError) { await popup.showError(`Erro ao buscar itens do pedido: ${itensError.message}`); return }
            if (!itensPedido || itensPedido.length === 0) { await popup.showWarning('Pedido sem itens.'); return }

            for (const item of itensPedido) {
                const quantidade = Number(item.quantidade || 0)
                if (quantidade <= 0) continue

                const { data: materialAtual, error: materialError } = await supabase
                    .from('materiais').select('id, saldo, entradas, valor_medio').eq('id', item.material_id).single()
                if (materialError || !materialAtual) { await popup.showError('Erro ao buscar material.'); return }

                await supabase.from('entradas').insert({
                    material_id: item.material_id,
                    fornecedor_id: pedido.fornecedor_id,
                    quantidade,
                    custo: 0,
                    data: new Date().toISOString().split('T')[0],
                    observacao: `Entrada automática do pedido #${pedido.id}`,
                })

                await supabase.from('materiais').update({
                    saldo: (materialAtual.saldo || 0) + quantidade,
                    entradas: (materialAtual.entradas || 0) + quantidade,
                    valor_total: (materialAtual.valor_medio || 0) * ((materialAtual.saldo || 0) + quantidade),
                }).eq('id', item.material_id)
            }
        }

        const { error } = await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedido.id)
        emitirEstoqueAtualizado()
        if (error) { await popup.showError(`Erro ao atualizar status: ${error.message}`); return }

        if (novoStatus === 'Recebido') {
            await popup.showSuccess('Pedido recebido! Estoque atualizado.')
            await carregarDados()
            navigate('/entradas')
            return
        }
        carregarDados()
    }

    function statusClass(status) {
        if (status === 'Recebido') return 'bg-green-900/30 text-green-400'
        if (status === 'Cancelado') return 'bg-red-900/30 text-red-400'
        return 'bg-blue-900/30 text-blue-400'
    }

    function formatarDataHora(registro) {
        const valor = registro.criado_em || registro.data
        if (!valor) return '—'
        return new Date(valor).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => { setForm(pedidoVazio); setItens([]); setItemForm({ material_id: '', quantidade: '' }); setModal(true) }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    Novo Pedido
                </button>
            </div>

            <div className="bg-gray-800 rounded-xl shadow overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-700 border-b border-gray-600">
                        <tr>
                            <th className="text-center px-4 py-3 text-gray-300">Data/Hora</th>
                            <th className="text-center px-4 py-3 text-gray-300">Fornecedor</th>
                            <th className="text-center px-4 py-3 text-gray-300">Materiais</th>
                            <th className="text-center px-4 py-3 text-gray-300">Qtd. Requerida</th>
                            <th className="text-center px-4 py-3 text-gray-300">Status</th>
                            <th className="text-center px-4 py-3 text-gray-300">Observação</th>
                            <th className="text-center px-4 py-3 text-gray-300">Tempo de Entrega</th>
                            <th className="text-center px-4 py-3 text-gray-300">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                        ) : pedidos.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum pedido registrado.</td></tr>
                        ) : pedidos.map(p => (
                            <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700">
                                <td className="px-4 py-3 text-center text-gray-400">{formatarDataHora(p)}</td>
                                <td className="px-4 py-3 text-center text-gray-400">{p.fornecedores?.nome || '—'}</td>
                                <td className="px-4 py-3 text-center text-gray-400">
                                    {(p.itens_pedido || []).length === 0 ? '—' : (
                                        <div className="flex flex-col gap-1">
                                            {p.itens_pedido.map((item, i) => (
                                                <span key={i} className="text-xs">
                                                    {item.materiais?.descricao}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-400">{(quantidadePorPedido[p.id] || 0).toLocaleString('pt-BR')} m²</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusClass(p.status)}`}>
                                        {p.status || 'Pendente'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center text-gray-400">{p.observacao || '—'}</td>
                                <td className="px-4 py-3 text-center text-gray-400">{p.tempo_entrega || '—'}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2 flex- justify-center">
                                        {p.status !== 'Recebido' && p.status !== 'Cancelado' && (
                                            <>
                                                <button onClick={() => alterarStatus(p, 'Recebido')}
                                                    className="text-xs border border-green-700 text-green-400 px-2 py-1 rounded hover:bg-green-900/30">
                                                    Recebido
                                                </button>
                                                <button onClick={() => alterarStatus(p, 'Cancelado')}
                                                    className="text-xs border border-red-700 text-red-400 px-2 py-1 rounded hover:bg-red-900/30">
                                                    Cancelado
                                                </button>
                                            </>
                                        )}
                                        {p.status === 'Cancelado' && (
                                            <button onClick={() => alterarStatus(p, 'Pendente')}
                                                className="text-xs border border-blue-700 text-blue-400 px-2 py-1 rounded hover:bg-blue-900/30">
                                                Pendente
                                            </button>
                                        )}
                                        {p.status === 'Recebido' && (
                                            <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                                                ✅ Entregue
                                            </span>
                                        )}
                                        {p.status === 'Cancelado' && (
                                            <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                                                ❌ Cancelado
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Novo Pedido */}
            {modal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-100">Novo Pedido</h3>
                            <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="text-sm text-gray-400">Fornecedor *</label>
                                <div className="mt-1 flex gap-2">
                                    <div className="flex-1">
                                        <SelectBusca
                                            opcoes={fornecedores}
                                            valor={form.fornecedor_id}
                                            onChange={v => setForm({ ...form, fornecedor_id: v })}
                                            placeholder="Selecione o fornecedor..."
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setModalFornecedor(true)}
                                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg border border-gray-600 text-sm transition-colors shrink-0"
                                        title="Cadastrar novo fornecedor"
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
                                <label className="text-sm text-gray-400">Tempo de Entrega</label>
                                <input
                                    type="text"
                                    value={form.tempo_entrega}
                                    onChange={e => setForm({ ...form, tempo_entrega: e.target.value })}
                                    placeholder="Ex: 3 dias, 2 semanas..."
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-sm text-gray-400">Observação</label>
                            <textarea rows={2} value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })}
                                className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                        </div>

                        <div className="border-t border-gray-700 pt-4">
                            <h4 className="font-medium text-gray-300 mb-3">Itens do Pedido</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                                <div className="sm:col-span-2">
                                    <SelectBusca
                                        opcoes={materiais}
                                        valor={itemForm.material_id}
                                        onChange={v => setItemForm({ ...itemForm, material_id: v })}
                                        placeholder="Buscar por nome ou SKU..."
                                        campoLabel="descricao"
                                        campoSecundario="sku"
                                    />
                                </div>
                                <input type="number" step="0.01" placeholder="Qtd" value={itemForm.quantidade}
                                    onChange={e => setItemForm({ ...itemForm, quantidade: e.target.value })}
                                    className="bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
                            </div>
                            <button onClick={adicionarItem}
                                className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg mb-3 transition-colors">
                                + Adicionar item
                            </button>

                            {itens.length > 0 && (
                                <table className="w-full text-sm border border-gray-700 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-700">
                                        <tr>
                                            <th className="text-left px-3 py-2 text-gray-300">Material</th>
                                            <th className="text-left px-3 py-2 text-gray-300">Quantidade</th>
                                            <th className="text-left px-3 py-2 text-gray-300">Unidade</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itens.map((item, i) => (
                                            <tr key={i} className="border-t border-gray-700">
                                                <td className="px-3 py-2 text-gray-200">{item.descricao}</td>
                                                <td className="px-3 py-2 text-gray-200">{item.quantidade}</td>
                                                <td className="px-3 py-2 text-gray-200">{item.unidade}</td>
                                                <td className="px-3 py-2">
                                                    <button onClick={() => removerItem(i)} className="text-red-400 hover:text-red-300">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
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
                                Registrar Pedido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Novo Fornecedor */}
            {modalFornecedor && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-100">Novo Fornecedor</h3>
                            <button onClick={() => { setModalFornecedor(false); setFormFornecedor({ nome: '', telefone: '', email: '', endereco: '' }) }} className="text-gray-400 hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-400">Nome *</label>
                                <input type="text" value={formFornecedor.nome}
                                    onChange={e => setFormFornecedor({ ...formFornecedor, nome: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                    placeholder="Nome do fornecedor" autoFocus />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Telefone</label>
                                <input type="text" value={formFornecedor.telefone}
                                    onChange={e => setFormFornecedor({ ...formFornecedor, telefone: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                    placeholder="(91) 99999-9999" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">E-mail</label>
                                <input type="email" value={formFornecedor.email}
                                    onChange={e => setFormFornecedor({ ...formFornecedor, email: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                    placeholder="email@fornecedor.com" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Endereço</label>
                                <input type="text" value={formFornecedor.endereco}
                                    onChange={e => setFormFornecedor({ ...formFornecedor, endereco: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                    placeholder="Rua, número, cidade..." />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setModalFornecedor(false); setFormFornecedor({ nome: '', telefone: '', email: '', endereco: '' }) }}
                                className="flex-1 border border-gray-600 text-gray-400 py-2 rounded-lg hover:bg-gray-700 transition">
                                Cancelar
                            </button>
                            <button onClick={cadastrarFornecedor}
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