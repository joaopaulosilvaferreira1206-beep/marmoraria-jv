import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Image } from 'lucide-react'
import { usePopup } from '../components/PopupProvider'
import { emitirEstoqueAtualizado } from '../lib/estoqueEvents'
import SelectBusca from '../components/SelectBusca'

export default function Entradas() {
    const popup = usePopup()
    const [entradas, setEntradas] = useState([])
    const [materiais, setMateriais] = useState([])
    const [fornecedores, setFornecedores] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(false)
    const [modalMaterial, setModalMaterial] = useState(false)
    const [modalFornecedor, setModalFornecedor] = useState(false)
    const [formMaterial, setFormMaterial] = useState({ descricao: '', minimo: '', maximo: '', unidade: 'M²' })
    const [formFornecedor, setFormFornecedor] = useState({ nome: '', telefone: '', email: '', endereco: '' })
    const [fotoFile, setFotoFile] = useState(null)
    const [fotoPreview, setFotoPreview] = useState(null)
    const [form, setForm] = useState({
        material_id: '',
        fornecedor_id: '',
        quantidade: '',
        custo: '',
        data: new Date().toISOString().split('T')[0],
        observacao: '',
    })

    useEffect(() => {
        carregarDados()
        const intervalo = setInterval(carregarDados, 20000)
        const canal = supabase.channel('entradas-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'entradas' }, carregarDados)
            .subscribe()
        return () => { clearInterval(intervalo); supabase.removeChannel(canal) }
    }, [])

    async function carregarDados() {
        setLoading(true)
        const [{ data: ent }, { data: mat }, { data: forn }] = await Promise.all([
            supabase.from('entradas').select('*, materiais(descricao), fornecedores(nome)').order('criado_em', { ascending: false }),
            supabase.from('materiais').select('id, sku, descricao').order('descricao'),
            supabase.from('fornecedores').select('id, nome').order('nome'),
        ])
        setEntradas(ent || [])
        setMateriais(mat || [])
        setFornecedores(forn || [])
        setLoading(false)
    }

    async function cadastrarMaterial() {
        if (!formMaterial.descricao) {
            await popup.showWarning('Preencha a descrição do material!')
            return
        }

        const { data: ultimo } = await supabase
            .from('materiais')
            .select('sku')
            .order('sku', { ascending: false })
            .limit(1)
            .single()

        const novoCodigo = (ultimo?.sku || 0) + 1

        const { data: novoMaterial, error: erroInsert } = await supabase.from('materiais').insert({
            sku: novoCodigo,
            descricao: formMaterial.descricao,
            valor_medio: 0,
            minimo: Number(formMaterial.minimo) || 0,
            maximo: Number(formMaterial.maximo) || 0,
            unidade: formMaterial.unidade,
            saldo: 0,
            entradas: 0,
            saidas: 0,
            perdas: 0,
            valor_total: 0,
        }).select().single()

        if (erroInsert || !novoMaterial?.id) {
            await popup.showError('Erro ao cadastrar material. Tente novamente.')
            return
        }

        if (fotoFile) {
            const ext = fotoFile.name.split('.').pop()
            const path = `${novoMaterial.id}.${ext}`
            const { error: uploadError } = await supabase.storage
                .from('materiais')
                .upload(path, fotoFile, { upsert: true })
            if (!uploadError) {
                const { data: urlData } = supabase.storage.from('materiais').getPublicUrl(path)
                const urlFinal = `${urlData.publicUrl}?t=${Date.now()}`
                await supabase.from('materiais').update({ imagem_url: urlFinal }).eq('id', novoMaterial.id)
            }
        }

        await carregarDados()
        setForm(f => ({ ...f, material_id: novoMaterial.id }))
        setFotoFile(null)
        setFotoPreview(null)
        setModalMaterial(false)
        setFormMaterial({ descricao: '', minimo: '', maximo: '', unidade: 'M²' })
        popup.showSuccess(`Material "${formMaterial.descricao}" cadastrado com código ${novoCodigo}!`)
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

    async function salvar() {
        if (!form.material_id || !form.quantidade) {
            await popup.showWarning('Preencha o material e a quantidade!')
            return
        }

        const quantidade = Number(form.quantidade)
        const custo = Number(form.custo) || 0

        const { data: mat } = await supabase
            .from('materiais')
            .select('saldo, entradas, valor_medio, valor_total, maximo, descricao')
            .eq('id', form.material_id)
            .single()

        if (mat) {
            const novoSaldo = (mat.saldo || 0) + quantidade

            if (mat.maximo && mat.maximo > 0) {
                if ((mat.saldo || 0) >= mat.maximo) {
                    await popup.showWarning(`Estoque de "${mat.descricao}" já está no limite máximo!\nMáximo: ${mat.maximo} m²\nSaldo atual: ${mat.saldo} m²`)
                    return
                }
                if (novoSaldo > mat.maximo) {
                    const confirmado = await popup.confirm(
                        `Esta entrada vai ultrapassar o estoque máximo de "${mat.descricao}"!\nMáximo: ${mat.maximo} m²\nSaldo atual: ${mat.saldo} m²\nApós entrada: ${novoSaldo} m²\n\nDeseja continuar mesmo assim?`
                    )
                    if (!confirmado) return
                }
            }

            const novasEntradas = (mat.entradas || 0) + quantidade
            const totalAnterior = (mat.valor_medio || 0) * (mat.saldo || 0)
            const totalNovo = custo * quantidade
            const novoValorMedio = novoSaldo > 0 ? (totalAnterior + totalNovo) / novoSaldo : custo
            const novoValorTotal = novoValorMedio * novoSaldo

            await supabase.from('entradas').insert({
                material_id: form.material_id,
                fornecedor_id: form.fornecedor_id || null,
                quantidade,
                custo,
                data: form.data,
                observacao: form.observacao,
            })

            await supabase.from('materiais').update({
                saldo: novoSaldo,
                entradas: novasEntradas,
                valor_medio: novoValorMedio,
                valor_total: novoValorTotal,
            }).eq('id', form.material_id)
        }

        emitirEstoqueAtualizado()
        setModal(false)
        setForm({
            material_id: '',
            fornecedor_id: '',
            quantidade: '',
            custo: '',
            data: new Date().toISOString().split('T')[0],
            observacao: '',
        })
        carregarDados()
    }

    function formatarDataHora(registro) {
        const criado = registro.criado_em
        const data = registro.data
        if (criado) {
            const valorUTC = criado.endsWith('Z') ? criado : criado + 'Z'
            return new Date(valorUTC).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
            })
        }
        if (data) {
            const [ano, mes, dia] = data.split('-')
            return `${dia}/${mes}/${ano}`
        }
        return '—'
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => setModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    Registrar Entrada
                </button>
            </div>

            <div className="bg-gray-800 rounded-xl shadow overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-700 border-b border-gray-600">
                        <tr>
                            <th className="text-center px-4 py-3 text-gray-300">Data/Hora</th>
                            <th className="text-center px-4 py-3 text-gray-300">Material</th>
                            <th className="text-center px-4 py-3 text-gray-300">Fornecedor</th>
                            <th className="text-center px-4 py-3 text-gray-300">Quantidade</th>
                            <th className="text-center px-4 py-3 text-gray-300">Custo Unit.</th>
                            <th className="text-center px-4 py-3 text-gray-300">Total</th>
                            <th className="text-center px-4 py-3 text-gray-300">Observação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                        ) : entradas.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma entrada registrada.</td></tr>
                        ) : entradas.map(e => (
                            <tr key={e.id} className="border-b border-gray-700 hover:bg-gray-700">
                                <td className="px-4 py-3 text-gray-400">{formatarDataHora(e)}</td>
                                <td className="px-4 py-3 text-center text-gray-400">{e.materiais?.descricao || '—'}</td>
                                <td className="px-4 py-3 text-center text-gray-400">{e.fornecedores?.nome || '—'}</td>
                                <td className="px-4 py-3 text-center text-gray-400">+{e.quantidade} m²</td>
                                <td className="px-4 py-3 text-center text-gray-400">R$ {(e.custo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 text-center text-gray-400">R$ {((e.custo || 0) * e.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 text-center text-gray-400">{e.observacao || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Registrar Entrada */}
            {modal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-100">Registrar Entrada</h3>
                            <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-400">Material *</label>
                                <div className="mt-1 flex gap-2">
                                    <div className="flex-1">
                                        <SelectBusca
                                            opcoes={materiais}
                                            valor={form.material_id}
                                            onChange={v => setForm({ ...form, material_id: v })}
                                            placeholder="Buscar por nome ou código..."
                                            campoLabel="descricao"
                                            campoSecundario="sku"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setModalMaterial(true)}
                                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg border border-gray-600 text-sm transition-colors shrink-0"
                                        title="Cadastrar novo material"
                                    >
                                        + Novo
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Fornecedor</label>
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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-gray-400">Quantidade (m²) *</label>
                                    <input type="number" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Custo Unitário (R$)</label>
                                    <input type="number" value={form.custo} onChange={e => setForm({ ...form, custo: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Data</label>
                                <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Observação</label>
                                <textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })}
                                    rows={2} className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setModal(false)}
                                className="flex-1 border border-gray-600 text-gray-400 py-2 rounded-lg hover:bg-gray-700 transition">
                                Cancelar
                            </button>
                            <button onClick={salvar}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                                Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Novo Material */}
            {modalMaterial && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-100">Novo Material</h3>
                            <button onClick={() => { setModalMaterial(false); setFotoFile(null); setFotoPreview(null) }} className="text-gray-400 hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-400">Descrição *</label>
                                <input
                                    type="text"
                                    value={formMaterial.descricao}
                                    onChange={e => setFormMaterial({ ...formMaterial, descricao: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                    placeholder="Ex: Mármore Branco"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-gray-400">Estoque Mínimo</label>
                                    <input type="number" value={formMaterial.minimo}
                                        onChange={e => setFormMaterial({ ...formMaterial, minimo: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Estoque Máximo</label>
                                    <input type="number" value={formMaterial.maximo}
                                        onChange={e => setFormMaterial({ ...formMaterial, maximo: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Unidade</label>
                                <select value={formMaterial.unidade}
                                    onChange={e => setFormMaterial({ ...formMaterial, unidade: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500">
                                    <option>M²</option>
                                    <option>UN</option>
                                    <option>KG</option>
                                    <option>L</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Foto do Material (opcional)</label>
                                <div className="mt-2 flex items-center gap-3">
                                    {fotoPreview ? (
                                        <img src={fotoPreview} alt="Prévia" className="w-16 h-16 object-cover rounded-lg border border-gray-600 shrink-0" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg border border-dashed border-gray-600 flex items-center justify-center shrink-0">
                                            <Image size={20} className="text-gray-600" />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="cursor-pointer">
                                            <span className="inline-block px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg border border-gray-600 transition-colors">
                                                {fotoPreview ? 'Trocar foto' : 'Selecionar foto'}
                                            </span>
                                            <input type="file" accept="image/*" className="hidden"
                                                onChange={e => {
                                                    const file = e.target.files[0]
                                                    if (!file) return
                                                    setFotoFile(file)
                                                    setFotoPreview(URL.createObjectURL(file))
                                                }} />
                                        </label>
                                        {fotoPreview && (
                                            <button type="button" onClick={() => { setFotoFile(null); setFotoPreview(null) }}
                                                className="text-xs text-red-400 hover:text-red-300 text-left">
                                                Remover foto
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setModalMaterial(false); setFotoFile(null); setFotoPreview(null) }}
                                className="flex-1 border border-gray-600 text-gray-400 py-2 rounded-lg hover:bg-gray-700 transition">
                                Cancelar
                            </button>
                            <button onClick={cadastrarMaterial}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                                Cadastrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Novo Fornecedor */}
            {modalFornecedor && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
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