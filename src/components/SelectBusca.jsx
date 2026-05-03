import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export default function SelectBusca({
    opcoes = [],
    valor,
    onChange,
    placeholder = 'Selecione...',
    campoLabel = 'nome',
    campoValor = 'id',
    campoSecundario = null,
}) {
    const [aberto, setAberto] = useState(false)
    const [busca, setBusca] = useState('')
    const ref = useRef(null)
    const inputRef = useRef(null)

    const opcaoSelecionada = opcoes.find(o => o[campoValor] === valor)

    const opcoesFiltradas = opcoes.filter(o => {
        const termo = busca.toLowerCase()
        const labelMatch = String(o[campoLabel] || '').toLowerCase().includes(termo)
        const secundarioMatch = campoSecundario
            ? String(o[campoSecundario] || '').toLowerCase().includes(termo)
            : false
        return labelMatch || secundarioMatch
    })

    useEffect(() => {
        function handleClickFora(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setAberto(false)
                setBusca('')
            }
        }
        document.addEventListener('mousedown', handleClickFora)
        return () => document.removeEventListener('mousedown', handleClickFora)
    }, [])

    useEffect(() => {
        if (aberto && inputRef.current) {
            inputRef.current.focus()
        }
    }, [aberto])

    function selecionar(opcao) {
        onChange(opcao[campoValor])
        setAberto(false)
        setBusca('')
    }

    return (
        <div ref={ref} className="relative w-full">
            {/* Botão principal */}
            <button
                type="button"
                onClick={() => setAberto(!aberto)}
                className="w-full flex items-center justify-between bg-gray-700 border border-gray-600 text-left rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            >
                <span className={opcaoSelecionada ? 'text-gray-100' : 'text-gray-500'}>
                    {opcaoSelecionada
                        ? campoSecundario
                            ? `[${opcaoSelecionada[campoSecundario]}] ${opcaoSelecionada[campoLabel]}`
                            : opcaoSelecionada[campoLabel]
                        : placeholder}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {aberto && (
                <div className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-xl"
                    style={{
                        width: ref.current?.getBoundingClientRect().width,
                        top: (ref.current?.getBoundingClientRect().bottom || 0) + 4,
                        left: ref.current?.getBoundingClientRect().left,
                    }}
                >
                    {/* Campo de busca */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700">
                        <Search size={14} className="text-gray-400 shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            placeholder="Buscar..."
                            className="flex-1 bg-transparent text-gray-100 text-sm focus:outline-none placeholder-gray-500"
                        />
                    </div>

                    {/* Lista */}
                    <div className="max-h-48 overflow-y-auto">
                        {opcoesFiltradas.length === 0 ? (
                            <div className="px-3 py-3 text-gray-500 text-sm text-center">
                                Nenhum resultado encontrado
                            </div>
                        ) : (
                            opcoesFiltradas.map(opcao => (
                                <button
                                    key={opcao[campoValor]}
                                    type="button"
                                    onClick={() => selecionar(opcao)}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-700 ${opcao[campoValor] === valor ? 'bg-blue-600/20 text-blue-300' : 'text-gray-200'
                                        }`}
                                >
                                    {campoSecundario && (
                                        <span className="text-gray-400 font-mono mr-2">[{opcao[campoSecundario]}]</span>
                                    )}
                                    {opcao[campoLabel]}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}