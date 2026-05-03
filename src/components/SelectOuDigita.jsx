import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export default function SelectOuDigita({
    opcoes = [],
    valor,
    onChange,
    placeholder = 'Selecione ou digite...',
}) {
    const [aberto, setAberto] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        function handleClickFora(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setAberto(false)
            }
        }
        document.addEventListener('mousedown', handleClickFora)
        return () => document.removeEventListener('mousedown', handleClickFora)
    }, [])

    const opcoesFiltradas = opcoes.filter(o =>
        o.toLowerCase().includes((valor || '').toLowerCase())
    )

    return (
        <div ref={ref} className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    value={valor || ''}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => setAberto(true)}
                    placeholder={placeholder}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-blue-500 placeholder-gray-500"
                />
                <button
                    type="button"
                    onClick={() => setAberto(!aberto)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                >
                    <ChevronDown size={16} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {aberto && opcoesFiltradas.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                        {opcoesFiltradas.map(opcao => (
                            <button
                                key={opcao}
                                type="button"
                                onClick={() => { onChange(opcao); setAberto(false) }}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-700 ${valor === opcao ? 'bg-blue-600/20 text-blue-300' : 'text-gray-200'
                                    }`}
                            >
                                {opcao}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}