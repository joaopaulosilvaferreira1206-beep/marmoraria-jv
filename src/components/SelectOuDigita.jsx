import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function SelectOuDigita({ label, value, onChange, placeholder = 'Selecione ou digite...', opcoes: opcoesProp }) {
    const [opcoes, setOpcoes] = useState(opcoesProp || [])
    const [aberto, setAberto] = useState(false)
    const [texto, setTexto] = useState(value || '')
    const ref = useRef()

    useEffect(() => {
        // eslint-disable-next-line react-hooks/immutability
        if (!opcoesProp) carregarOpcoes()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTexto(value || '')
    }, [value])

    useEffect(() => {
        function fechar(e) {
            if (ref.current && !ref.current.contains(e.target)) setAberto(false)
        }
        document.addEventListener('mousedown', fechar)
        return () => document.removeEventListener('mousedown', fechar)
    }, [])

    async function carregarOpcoes() {
        const { data } = await supabase
            .from('tipos_trabalho')
            .select('nome')
            .order('nome')
        if (data) setOpcoes(data.map(d => d.nome))
    }

    async function salvarNovoTipo(nome) {
        if (opcoesProp) return // modo estático, não salva no banco
        const nomeLimpo = nome.trim()
        if (!nomeLimpo || opcoes.includes(nomeLimpo)) return
        await supabase.from('tipos_trabalho').insert({ nome: nomeLimpo })
        setOpcoes(prev => [...prev, nomeLimpo].sort())
    }

    const termo = texto.toLowerCase();
    const filtradas = texto
      ? [...opcoes.filter(o => o.toLowerCase().startsWith(termo)), ...opcoes.filter(o => !o.toLowerCase().startsWith(termo) && o.toLowerCase().includes(termo))]
      : opcoes;

    function selecionar(opcao) {
        setTexto(opcao)
        onChange(opcao)
        setAberto(false)
    }

    function handleBlur() {
        setTimeout(() => {
            if (texto.trim() && !opcoes.includes(texto.trim())) {
                salvarNovoTipo(texto.trim())
            }
            onChange(texto.trim())
            setAberto(false)
        }, 150)
    }

    return (
        <div ref={ref} className="relative">
            {label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}
            <input
                type="text"
                value={texto}
                onChange={e => { setTexto(e.target.value); setAberto(true) }}
                onFocus={() => setAberto(true)}
                onBlur={handleBlur}
                placeholder={placeholder}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {aberto && filtradas.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filtradas.map(opcao => (
                        <li
                            key={opcao}
                            onMouseDown={() => selecionar(opcao)}
                            className="px-3 py-2 text-gray-100 hover:bg-gray-600 cursor-pointer text-sm"
                        >
                            {opcao}
                        </li>
                    ))}
                    {!opcoesProp && texto.trim() && !opcoes.includes(texto.trim()) && (
                        <li
                            onMouseDown={() => selecionar(texto.trim())}
                            className="px-3 py-2 text-blue-400 hover:bg-gray-600 cursor-pointer text-sm border-t border-gray-600"
                        >
                            + Adicionar "{texto.trim()}"
                        </li>
                    )}
                </ul>
            )}
        </div>
    )
}