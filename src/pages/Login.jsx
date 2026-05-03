import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const [mostrarSenha, setMostrarSenha] = useState(false)

    async function entrar() {
        if (!email || !senha) {
            setErro('Preencha o email e a senha!')
            return
        }
        setLoading(true)
        setErro('')

        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

        if (error) {
            setErro('Email ou senha incorretos.')
        } else {
            onLogin()
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 w-full max-w-sm">

                <div className="text-center mb-8">
                    <div className="text-4xl mb-2">💎</div>
                    <h1 className="text-2xl font-bold text-gray-100">Marmoraria JV</h1>
                    <p className="text-gray-400 text-sm mt-1">Gestão de Estoque</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && entrar()}
                            placeholder="seu@email.com"
                            className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-4 py-2 mt-1 focus:outline-none focus:border-blue-500 placeholder-gray-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400">Senha</label>
                        <div className="relative mt-1">
                            <input
                                type={mostrarSenha ? 'text' : 'password'}
                                value={senha}
                                onChange={e => setSenha(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && entrar()}
                                placeholder="••••••••"
                                className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:border-blue-500 placeholder-gray-500"
                            />
                            <button
                                type="button"
                                onClick={() => setMostrarSenha(!mostrarSenha)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                            >
                                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {erro && (
                        <p className="text-red-400 text-sm text-center">{erro}</p>
                    )}

                    <button
                        onClick={entrar}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </div>
            </div>
        </div>
    )
}