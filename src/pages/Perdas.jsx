import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatarDataHora } from '../lib/formatarData'
import { Plus, X } from 'lucide-react'
import { usePopup } from '../components/PopupProvider'
import { emitirEstoqueAtualizado } from '../lib/estoqueEvents'
import SelectBusca from '../components/SelectBusca'

const perdaVazia = {
    material_id: '',
    quantidade: '',
    motivo: '',
    data: new Date().toISOString().split('T')[0],
}

export default function Perdas() {
    const popup = usePopup()
    const [perdas, setPerdas] = useState([])
    const [materiais, setMateriais] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(false)
    const [form, setForm] = useState(perdaVazia)

    useEffect(() => {
        carregarDados()
        const canal = supabase.channel('perdas-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'perdas' }, carregarDados)
            .subscribe()
        return () => supabase.removeChannel(canal)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    async function carregarDados() {
        setLoading(true)
        const [{ data: per, error: perError }, { data: mat, error: matError }] = await Promise.all([
            supabase.from('perdas').select('*, materiais(descricao)').order('data', { ascending: false }),
            supabase.from('materiais').select('id, sku, descricao, saldo, perdas, unidade, valor_medio').order('descricao'),
        ])
        if (perError || matError) await popup.showError('Erro ao carregar dados de perdas.')
        setPerdas(per || [])
        setMateriais(mat || [])
        setLoading(false)
    }

    async function salvar() {
        if (!form.material_id || !form.quantidade) {
            await popup.showWarning('Preencha o material e a quantidade!')
            return
        }
        const quantidade = Number(form.quantidade)
        if (quantidade <= 0) {
            await popup.showWarning('A quantidade precisa ser maior que zero!')
            return
        }
        const material = materiais.find(m => m.id === form.material_id)
        if (!material) { await popup.showError('Material inválido.'); return }
        if (quantidade > (material.saldo || 0)) {
            await popup.showWarning(`Saldo insuficiente!\nDisponível: ${material.saldo || 0} ${material.unidade || 'm²'}`)
            return
        }

        const { error: insertError } = await supabase.from('perdas').insert({
            material_id: form.material_id,
            quantidade,
            motivo: form.motivo,
            data: form.data,
        })
        if (insertError) { await popup.showError('Erro ao registrar perda.'); return }

        const { error: updateError } = await supabase.from('materiais').update({
            saldo: (material.saldo || 0) - quantidade,
            perdas: (material.perdas || 0) + quantidade,
            valor_total: (material.valor_medio || 0) * ((material.saldo || 0) - quantidade),
        }).eq('id', form.material_id)

        emitirEstoqueAtualizado()

        if (updateError) {
            await popup.showWarning('Perda registrada, mas houve erro ao atualizar o estoque.')
            return
        }

        setModal(false)
        setForm(perdaVazia)
        carregarDados()
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => { setForm(perdaVazia); setModal(true) }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    Registrar Perda
                </button>
            </div>

            <div className="bg-gray-800 rounded-xl shadow overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-700 border-b border-gray-600">
                        <tr>
                            <th className="text-center px-4 py-3 text-gray-300">Data/Hora</th>
                            <th className="text-center px-4 py-3 text-gray-300">Material</th>
                            <th className="text-center px-4 py-3 text-gray-300">Quantidade</th>
                            <th className="text-center px-4 py-3 text-gray-300">Motivo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* eslint-disable-next-line no-nested-ternary */}
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                        ) : perdas.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhuma perda registrada.</td></tr>
                        ) : perdas.map(p => (
                            <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700">
                                <td className="px-4 py-3 text-gray-400">{formatarDataHora(p)}</td>
                                <td className="px-4 py-3 text-center text-gray-400">{p.materiais?.descricao || '—'}</td>
                                <td className="px-4 py-3 text-center text-red-400 font-bold">-{p.quantidade} m²</td>
                                <td className="px-4 py-3 text-center text-gray-400">{p.motivo || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-100">Registrar Perda</h3>
                            <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-400">Material *</label>
                                <div className="mt-1">
                                    <SelectBusca
                                        opcoes={materiais}
                                        valor={form.material_id}
                                        onChange={v => setForm({ ...form, material_id: v })}
                                        placeholder="Buscar por nome ou SKU..."
                                        campoLabel="descricao"
                                        campoSecundario="sku"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-gray-400">Quantidade *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.quantidade}
                                        onChange={e => setForm({ ...form, quantidade: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Data</label>
                                    <input
                                        type="date"
                                        value={form.data}
                                        onChange={e => setForm({ ...form, data: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Motivo</label>
                                <textarea
                                    rows={2}
                                    value={form.motivo}
                                    onChange={e => setForm({ ...form, motivo: e.target.value })}
                                    placeholder="Ex: quebra no transporte"
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                                />
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
        </div>
    )
}