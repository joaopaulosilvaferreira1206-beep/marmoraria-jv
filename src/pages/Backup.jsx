import { useEffect, useState } from 'react'
import { DatabaseBackup, RotateCcw, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { restaurarBackup } from '../lib/backup'
import { usePopup } from '../components/PopupProvider'

export default function Backup() {
    const [backups, setBackups] = useState([])
    const [restaurando, setRestaurando] = useState(false)
    const [selecionado, setSelecionado] = useState(null)
    const { showPopup } = usePopup()

    useEffect(() => {
        // eslint-disable-next-line react-hooks/immutability
        carregarBackups()
    }, [])

    async function carregarBackups() {
        if (!window.electronAPI) return
        const lista = await window.electronAPI.listarBackups()
        setBackups(lista)
    }

    async function handleRestaurar() {
        if (!selecionado) return

        showPopup({
            tipo: 'confirmacao',
            titulo: 'Restaurar Backup',
            mensagem: `Tem certeza? Todos os dados atuais serão substituídos pelos dados do backup de ${selecionado.data}. Esta ação não pode ser desfeita.`,
            onConfirmar: async () => {
                setRestaurando(true)
                const resultado = await restaurarBackup(selecionado.caminho)
                setRestaurando(false)

                if (resultado.ok) {
                    showPopup({
                        tipo: 'sucesso',
                        titulo: 'Backup Restaurado',
                        mensagem: 'Os dados foram restaurados com sucesso!',
                    })
                } else {
                    showPopup({
                        tipo: 'erro',
                        titulo: 'Erro ao Restaurar',
                        mensagem: resultado.erro || 'Não foi possível restaurar o backup.',
                    })
                }
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div>
                <h1 className="text-2xl font-bold text-gray-100">Backup e Restauração</h1>
                <p className="text-gray-400 mt-1">
                    O backup é feito automaticamente ao abrir o app e a cada 24 horas.
                </p>
            </div>

            {/* Info */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-start gap-3">
                <DatabaseBackup className="text-blue-400 mt-0.5 shrink-0" size={20} />
                <div>
                    <p className="text-gray-200 font-medium">Onde ficam os backups?</p>
                    <p className="text-gray-400 text-sm mt-1">
                        Os arquivos são salvos automaticamente em:<br />
                        <span className="text-blue-400 font-mono text-xs">
                            Documentos\MarmorariaJV\backups\
                        </span>
                    </p>
                </div>
            </div>

            {/* Lista de backups */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-gray-100 font-semibold">Backups Disponíveis</h2>
                    <p className="text-gray-400 text-sm">Selecione um backup para restaurar</p>
                </div>

                {backups.length === 0 ? (
                    <div className="p-8 text-center">
                        <Clock className="mx-auto text-gray-600 mb-2" size={32} />
                        <p className="text-gray-400">Nenhum backup encontrado.</p>
                        <p className="text-gray-500 text-sm mt-1">O primeiro backup será gerado ao abrir o app.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-700">
                        {backups.map((backup) => (
                            <button
                                key={backup.caminho}
                                onClick={() => setSelecionado(backup)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selecionado?.caminho === backup.caminho
                                        ? 'bg-blue-600/20 border-l-2 border-blue-500'
                                        : 'hover:bg-gray-700/50'
                                    }`}
                            >
                                {selecionado?.caminho === backup.caminho
                                    ? <CheckCircle className="text-blue-400 shrink-0" size={18} />
                                    : <DatabaseBackup className="text-gray-500 shrink-0" size={18} />
                                }
                                <div>
                                    <p className="text-gray-200 text-sm font-medium">
                                        {backup.data.replace('T', ' às ')}
                                    </p>
                                    <p className="text-gray-500 text-xs font-mono">{backup.nome}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

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