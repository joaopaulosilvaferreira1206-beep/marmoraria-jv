import { useEffect, useState } from 'react'
import { DatabaseBackup, RotateCcw, CheckCircle, AlertTriangle, Clock, Save, Cloud } from 'lucide-react'
import { restaurarBackup, restaurarBackupNuvem, gerarBackup, listarBackupsNuvem } from '../lib/backup'
import { usePopup } from '../components/PopupProvider'

export default function Backup() {
    const [backups, setBackups] = useState([])
    const [backupsNuvem, setBackupsNuvem] = useState([])
    const [restaurando, setRestaurando] = useState(false)
    const [salvando, setSalvando] = useState(false)
    const [selecionado, setSelecionado] = useState(null)
    const { showPopup } = usePopup()
    const isElectron = !!window.electronAPI

    useEffect(() => {
        carregarBackups()
    }, [])

    async function carregarBackups() {
        if (isElectron) {
            const lista = await window.electronAPI.listarBackups()
            setBackups(lista)
        }
        const nuvem = await listarBackupsNuvem()
        setBackupsNuvem(nuvem)
    }

    async function handleBackupManual() {
        setSalvando(true)
        try {
            const resultado = await gerarBackup()
            if (resultado?.ok) {
                showPopup({ tipo: 'sucesso', titulo: 'Backup Salvo', mensagem: isElectron ? 'Backup salvo localmente!' : 'Backup salvo na nuvem!' })
                carregarBackups()
            } else {
                showPopup({ tipo: 'erro', titulo: 'Erro', mensagem: resultado?.erro || 'Não foi possível gerar o backup.' })
            }
        } finally {
            setSalvando(false)
        }
    }

    async function handleRestaurar() {
        if (!selecionado) return
        const data = selecionado.data || new Date(selecionado.criado_em).toLocaleString('pt-BR')
        showPopup({
            tipo: 'confirmacao',
            titulo: 'Restaurar Backup',
            mensagem: `Tem certeza? Todos os dados atuais serão substituídos pelos dados do backup de ${data}. Esta ação não pode ser desfeita.`,
            onConfirmar: async () => {
                setRestaurando(true)
                const resultado = selecionado.tipo === 'nuvem'
                    ? await restaurarBackupNuvem(selecionado.id)
                    : await restaurarBackup(selecionado.caminho)
                setRestaurando(false)
                if (resultado.ok) {
                    showPopup({ tipo: 'sucesso', titulo: 'Backup Restaurado', mensagem: 'Os dados foram restaurados com sucesso!' })
                    setSelecionado(null)
                } else {
                    showPopup({ tipo: 'erro', titulo: 'Erro ao Restaurar', mensagem: resultado.erro || 'Não foi possível restaurar.' })
                }
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">Backup e Restauração</h1>
                    <p className="text-gray-400 mt-1">
                        {isElectron ? 'Backup local automático ao abrir o app e a cada 24h.' : 'Backup na nuvem — salvo no Supabase.'}
                    </p>
                </div>
                <button
                    onClick={handleBackupManual}
                    disabled={salvando}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
                >
                    {isElectron ? <Save size={16} /> : <Cloud size={16} />}
                    {salvando ? 'Salvando…' : 'Fazer Backup Agora'}
                </button>
            </div>

            {/* Backups na nuvem */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex items-center gap-2">
                    <Cloud size={18} className="text-blue-400" />
                    <div>
                        <h2 className="text-gray-100 font-semibold">Backups na Nuvem</h2>
                        <p className="text-gray-400 text-sm">Salvos no Supabase — acessíveis de qualquer dispositivo</p>
                    </div>
                </div>
                {backupsNuvem.length === 0 ? (
                    <div className="p-8 text-center">
                        <Cloud className="mx-auto text-gray-600 mb-2" size={32} />
                        <p className="text-gray-400">Nenhum backup na nuvem.</p>
                        <p className="text-gray-500 text-sm mt-1">Clique em "Fazer Backup Agora" para criar um.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-700 max-h-64 overflow-y-auto">
                        {backupsNuvem.map((b) => (
                            <button
                                key={b.id}
                                onClick={() => setSelecionado({ ...b, tipo: 'nuvem' })}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                    selecionado?.id === b.id ? 'bg-blue-600/20 border-l-2 border-blue-500' : 'hover:bg-gray-700/50'
                                }`}
                            >
                                {selecionado?.id === b.id
                                    ? <CheckCircle className="text-blue-400 shrink-0" size={18} />
                                    : <Cloud className="text-gray-500 shrink-0" size={18} />}
                                <p className="text-gray-200 text-sm">
                                    {new Date(b.criado_em).toLocaleString('pt-BR')}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Backups locais (só Electron) */}
            {isElectron && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-700 flex items-center gap-2">
                        <DatabaseBackup size={18} className="text-gray-400" />
                        <div>
                            <h2 className="text-gray-100 font-semibold">Backups Locais</h2>
                            <p className="text-gray-400 text-sm font-mono text-xs">Documentos\MarmorariaJV\backups\</p>
                        </div>
                    </div>
                    {backups.length === 0 ? (
                        <div className="p-8 text-center">
                            <Clock className="mx-auto text-gray-600 mb-2" size={32} />
                            <p className="text-gray-400">Nenhum backup local encontrado.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-700 max-h-64 overflow-y-auto">
                            {backups.map((b) => (
                                <button
                                    key={b.caminho}
                                    onClick={() => setSelecionado({ ...b, tipo: 'local' })}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                        selecionado?.caminho === b.caminho ? 'bg-blue-600/20 border-l-2 border-blue-500' : 'hover:bg-gray-700/50'
                                    }`}
                                >
                                    {selecionado?.caminho === b.caminho
                                        ? <CheckCircle className="text-blue-400 shrink-0" size={18} />
                                        : <DatabaseBackup className="text-gray-500 shrink-0" size={18} />}
                                    <div>
                                        <p className="text-gray-200 text-sm font-medium">{b.data.replace('T', ' às ')}</p>
                                        <p className="text-gray-500 text-xs font-mono">{b.nome}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Botão restaurar */}
            {selecionado && (
                <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-yellow-400 shrink-0" size={20} />
                        <p className="text-yellow-200 text-sm">
                            Restaurar substituirá <strong>todos os dados atuais</strong> pelos do backup selecionado.
                        </p>
                    </div>
                    <button
                        onClick={handleRestaurar}
                        disabled={restaurando}
                        className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                    >
                        <RotateCcw size={16} className={restaurando ? 'animate-spin' : ''} />
                        {restaurando ? 'Restaurando...' : 'Restaurar'}
                    </button>
                </div>
            )}
        </div>
    )
}
