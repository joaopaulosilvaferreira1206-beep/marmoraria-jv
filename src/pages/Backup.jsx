import { useEffect, useState } from 'react'
import {
    RotateCcw, CheckCircle, AlertTriangle,
    Cloud, Layers, ChevronDown, ChevronRight, Trash2, Save,
} from 'lucide-react'
import {
    restaurarBackupNuvem, gerarBackup,
    listarBackupsNuvem, carregarDadosBackup, restaurarSeletivo,
    excluirBackupNuvem,
} from '../lib/backup'
import { usePopup } from '../components/PopupProvider'

const TABELAS_CONFIG = {
    clientes:        { label: 'Clientes',           rotulo: r => r.nome },
    fornecedores:    { label: 'Fornecedores',        rotulo: r => r.nome },
    materiais:       { label: 'Materiais (Estoque)', rotulo: r => r.descricao + (r.sku ? ` — ${r.sku}` : '') },
    vendas:          { label: 'Vendas',              rotulo: r => `${new Date(r.data).toLocaleDateString('pt-BR')} · R$ ${(r.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    orcamentos:      { label: 'Orçamentos',          rotulo: r => `${new Date(r.data).toLocaleDateString('pt-BR')} · ${r.status}` },
    pedidos:         { label: 'Pedidos',             rotulo: r => `Pedido ${r.id?.slice(0, 8)}` },
    entradas:        { label: 'Entradas',            rotulo: r => `${new Date(r.data || r.criado_em).toLocaleDateString('pt-BR')}` },
    perdas:          { label: 'Perdas',              rotulo: r => `${new Date(r.data || r.criado_em).toLocaleDateString('pt-BR')}` },
    itens_venda:     { label: 'Itens de Venda',      rotulo: r => `Item · venda ${r.venda_id?.slice(0, 8)}` },
    itens_orcamento: { label: 'Itens de Orçamento',  rotulo: r => `Item · orç. ${r.orcamento_id?.slice(0, 8)}` },
    itens_pedido:    { label: 'Itens de Pedido',     rotulo: r => `Item · pedido ${r.pedido_id?.slice(0, 8)}` },
}

function contarSelecionados(selecao) {
    return Object.values(selecao).reduce((acc, ids) => acc + ids.size, 0)
}

function construirPayload(dadosBackup, selecao) {
    const payload = {}
    for (const [tabela, ids] of Object.entries(selecao)) {
        if (!ids.size) continue
        payload[tabela] = (dadosBackup[tabela] || []).filter(r => ids.has(r.id))
    }
    return payload
}

export default function Backup() {
    const [backupsNuvem, setBackupsNuvem] = useState([])
    const [restaurando, setRestaurando] = useState(false)
    const [salvando, setSalvando] = useState(false)
    const [selecionado, setSelecionado] = useState(null)
    const [dadosBackup, setDadosBackup] = useState(null)
    const [carregandoDados, setCarregandoDados] = useState(false)
    const [modoRestauracao, setModoRestauracao] = useState('completo')
    const [selecao, setSelecao] = useState({})
    const [expandida, setExpandida] = useState(null)
    const { confirm, showSuccess, showError } = usePopup()

    useEffect(() => { carregarBackups() }, [])

    async function carregarBackups() {
        const nuvem = await listarBackupsNuvem()
        setBackupsNuvem(nuvem)
    }

    function selecionarBackup(backup) {
        setSelecionado(backup)
        setDadosBackup(null)
        setModoRestauracao('completo')
        setSelecao({})
        setExpandida(null)
    }

    async function abrirModoSeletivo() {
        if (dadosBackup) { setModoRestauracao('seletivo'); return }
        setCarregandoDados(true)
        try {
            const dados = await carregarDadosBackup(selecionado)
            setDadosBackup(dados)
            const selecaoInicial = {}
            for (const tabela of Object.keys(TABELAS_CONFIG)) {
                if (dados[tabela]?.length) {
                    selecaoInicial[tabela] = new Set(dados[tabela].map(r => r.id))
                }
            }
            setSelecao(selecaoInicial)
            setModoRestauracao('seletivo')
        } catch (e) {
            showError(e.message)
        } finally {
            setCarregandoDados(false)
        }
    }

    function toggleTabela(tabela) {
        const registros = dadosBackup[tabela] || []
        const ids = selecao[tabela] || new Set()
        const allSelected = ids.size === registros.length
        setSelecao(prev => ({
            ...prev,
            [tabela]: allSelected ? new Set() : new Set(registros.map(r => r.id)),
        }))
    }

    function toggleRegistro(tabela, id) {
        setSelecao(prev => {
            const ids = new Set(prev[tabela] || [])
            ids.has(id) ? ids.delete(id) : ids.add(id)
            return { ...prev, [tabela]: ids }
        })
    }

    async function handleExcluir(backup, e) {
        e.stopPropagation()
        const ok = await confirm(
            `Excluir o backup de ${new Date(backup.criado_em).toLocaleString('pt-BR')}? Esta ação não pode ser desfeita.`,
            'Excluir Backup'
        )
        if (!ok) return
        const resultado = await excluirBackupNuvem(backup.id)
        if (resultado?.ok) {
            if (selecionado?.id === backup.id) { setSelecionado(null); setDadosBackup(null) }
            carregarBackups()
        } else {
            showError(resultado?.erro || 'Não foi possível excluir.')
        }
    }

    async function handleBackupManual() {
        setSalvando(true)
        try {
            const resultado = await gerarBackup()
            if (resultado?.ok) {
                showSuccess('Backup salvo na nuvem!', 'Backup Salvo')
                carregarBackups()
            } else {
                showError(resultado?.erro || 'Não foi possível gerar o backup.')
            }
        } finally {
            setSalvando(false)
        }
    }

    async function handleRestaurarCompleto() {
        if (!selecionado) return
        const ok = await confirm(
            `Todos os dados atuais serão substituídos pelos do backup de ${new Date(selecionado.criado_em).toLocaleString('pt-BR')}. Esta ação não pode ser desfeita.`,
            'Restaurar Backup Completo'
        )
        if (!ok) return
        setRestaurando(true)
        const resultado = await restaurarBackupNuvem(selecionado.id)
        setRestaurando(false)
        if (resultado.ok) {
            showSuccess('Dados restaurados com sucesso!', 'Backup Restaurado')
            setSelecionado(null); setDadosBackup(null)
        } else {
            showError(resultado.erro || 'Não foi possível restaurar.')
        }
    }

    async function handleRestaurarSeletivo() {
        const total = contarSelecionados(selecao)
        if (!total) return
        const ok = await confirm(
            `${total} registro${total !== 1 ? 's' : ''} serão mesclados com os dados atuais. Registros existentes serão atualizados; nada será apagado.`,
            'Restaurar Registros Selecionados'
        )
        if (!ok) return
        setRestaurando(true)
        const payload = construirPayload(dadosBackup, selecao)
        const resultado = await restaurarSeletivo(payload)
        setRestaurando(false)
        if (resultado.ok) {
            showSuccess('Dados mesclados com sucesso!', 'Restauração Concluída')
            setSelecionado(null); setDadosBackup(null)
            const fazerBackup = await confirm('Deseja gerar um novo backup do estado atual?', 'Fazer Backup')
            if (fazerBackup) handleBackupManual()
        } else {
            showError(resultado.erro || 'Não foi possível restaurar.')
        }
    }

    const totalSelecionados = contarSelecionados(selecao)

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">Backup e Restauração</h1>
                    <p className="text-gray-400 mt-1">Backup automático diário às 03h — salvo na nuvem.</p>
                </div>
                <button
                    onClick={handleBackupManual}
                    disabled={salvando}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
                >
                    <Save size={16} />
                    {salvando ? 'Salvando…' : 'Fazer Backup Agora'}
                </button>
            </div>

            {/* Lista de backups */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex items-center gap-2">
                    <Cloud size={18} className="text-blue-400" />
                    <div>
                        <h2 className="text-gray-100 font-semibold">Backups na Nuvem</h2>
                        <p className="text-gray-400 text-sm">Acessíveis de qualquer dispositivo · máximo 30 backups</p>
                    </div>
                </div>
                {backupsNuvem.length === 0 ? (
                    <div className="p-8 text-center">
                        <Cloud className="mx-auto text-gray-600 mb-2" size={32} />
                        <p className="text-gray-400">Nenhum backup ainda.</p>
                        <p className="text-gray-500 text-sm mt-1">Clique em "Fazer Backup Agora" para criar um.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-700 max-h-72 overflow-y-auto">
                        {backupsNuvem.map((b) => (
                            <div
                                key={b.id}
                                onClick={() => selecionarBackup(b)}
                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                    selecionado?.id === b.id ? 'bg-blue-600/20 border-l-2 border-blue-500' : 'hover:bg-gray-700/50'
                                }`}
                            >
                                {selecionado?.id === b.id
                                    ? <CheckCircle className="text-blue-400 shrink-0" size={18} />
                                    : <Cloud className="text-gray-500 shrink-0" size={18} />}
                                <p className="text-gray-200 text-sm flex-1">
                                    {new Date(b.criado_em).toLocaleString('pt-BR')}
                                </p>
                                <button
                                    onClick={(e) => handleExcluir(b, e)}
                                    className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded"
                                    title="Excluir backup"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Painel de restauração */}
            {selecionado && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-700 flex items-center gap-3">
                        <AlertTriangle className="text-yellow-400 shrink-0" size={18} />
                        <h2 className="text-gray-100 font-semibold">Restaurar Backup</h2>
                    </div>

                    <div className="p-4 flex gap-3">
                        <button
                            onClick={() => setModoRestauracao('completo')}
                            className={`flex-1 flex items-center gap-2 justify-center py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                modoRestauracao === 'completo'
                                    ? 'bg-yellow-600/20 border-yellow-500 text-yellow-200'
                                    : 'border-gray-600 text-gray-400 hover:border-gray-500'
                            }`}
                        >
                            <RotateCcw size={15} />
                            Restauração Completa
                        </button>
                        <button
                            onClick={abrirModoSeletivo}
                            disabled={carregandoDados}
                            className={`flex-1 flex items-center gap-2 justify-center py-2 px-3 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
                                modoRestauracao === 'seletivo'
                                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                                    : 'border-gray-600 text-gray-400 hover:border-gray-500'
                            }`}
                        >
                            <Layers size={15} />
                            {carregandoDados ? 'Carregando…' : 'Restauração Seletiva'}
                        </button>
                    </div>

                    {modoRestauracao === 'completo' && (
                        <div className="px-4 pb-4 flex items-center justify-between gap-4">
                            <p className="text-yellow-200 text-sm">
                                <strong>Todos os dados atuais</strong> serão substituídos pelos do backup.
                            </p>
                            <button
                                onClick={handleRestaurarCompleto}
                                disabled={restaurando}
                                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                            >
                                <RotateCcw size={16} className={restaurando ? 'animate-spin' : ''} />
                                {restaurando ? 'Restaurando...' : 'Restaurar Tudo'}
                            </button>
                        </div>
                    )}

                    {modoRestauracao === 'seletivo' && dadosBackup && (
                        <div className="px-4 pb-4 space-y-2">
                            <p className="text-gray-400 text-sm pb-1">
                                Expanda cada tabela para escolher registros específicos. Os dados serão <strong className="text-gray-200">mesclados</strong> — nada é apagado.
                            </p>

                            {Object.entries(TABELAS_CONFIG).map(([tabela, cfg]) => {
                                const registros = dadosBackup[tabela] || []
                                if (!registros.length) return null
                                const ids = selecao[tabela] || new Set()
                                const allChecked = ids.size === registros.length
                                const partialChecked = ids.size > 0 && !allChecked
                                const aberta = expandida === tabela

                                return (
                                    <div key={tabela} className="border border-gray-700 rounded-lg overflow-hidden">
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <input
                                                type="checkbox"
                                                checked={allChecked}
                                                ref={el => { if (el) el.indeterminate = partialChecked }}
                                                onChange={() => toggleTabela(tabela)}
                                                className="accent-blue-500 w-4 h-4 shrink-0 cursor-pointer"
                                            />
                                            <button
                                                onClick={() => setExpandida(aberta ? null : tabela)}
                                                className="flex-1 flex items-center justify-between gap-2 text-left"
                                            >
                                                <span className="text-gray-200 text-sm font-medium">{cfg.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${ids.size > 0 ? 'bg-blue-600/30 text-blue-300' : 'bg-gray-700 text-gray-500'}`}>
                                                        {ids.size}/{registros.length}
                                                    </span>
                                                    {aberta ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                                                </div>
                                            </button>
                                        </div>

                                        {aberta && (
                                            <div className="divide-y divide-gray-700/50 max-h-48 overflow-y-auto bg-gray-900/30">
                                                {registros.map(r => (
                                                    <label
                                                        key={r.id}
                                                        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-700/30 transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={ids.has(r.id)}
                                                            onChange={() => toggleRegistro(tabela, r.id)}
                                                            className="accent-blue-500 w-4 h-4 shrink-0"
                                                        />
                                                        <span className="text-gray-300 text-sm truncate">
                                                            {cfg.rotulo(r)}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            <div className="flex items-center justify-between pt-2">
                                <p className="text-gray-500 text-xs">
                                    {totalSelecionados} registro{totalSelecionados !== 1 ? 's' : ''} selecionado{totalSelecionados !== 1 ? 's' : ''}
                                </p>
                                <button
                                    onClick={handleRestaurarSeletivo}
                                    disabled={restaurando || totalSelecionados === 0}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Layers size={16} className={restaurando ? 'animate-spin' : ''} />
                                    {restaurando ? 'Restaurando...' : `Mesclar ${totalSelecionados > 0 ? totalSelecionados : ''} Registro${totalSelecionados !== 1 ? 's' : ''}`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
