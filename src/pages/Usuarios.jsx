import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePopup } from '../components/PopupProvider'
import { Trash2, UserPlus, Shield, User, Eye, EyeOff } from 'lucide-react'

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([])
    const [loading, setLoading] = useState(true)
    const [criando, setCriando] = useState(false)
    const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'operador' })
    const { showSuccess, showError, showWarning, confirm } = usePopup()
    const [salvando, setSalvando] = useState(false)
    const [mostrarSenha, setMostrarSenha] = useState(false)

    useEffect(() => {
        carregarUsuarios()
    }, [])

    async function carregarUsuarios() {
        setLoading(true)
        const { data } = await supabase.from('perfis').select('*').order('criado_em')
        setUsuarios(data || [])
        setLoading(false)
    }

    async function handleCriar() {
        if (!form.nome || !form.email || !form.senha) {
            showWarning('Preencha todos os campos.')
            return
        }

        setSalvando(true)
        const { data: { session } } = await supabase.auth.getSession()

        const resposta = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-usuario`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(form)
            }
        )

        const resultado = await resposta.json()
        setSalvando(false)

        if (!resultado.ok) {
            showError(resultado.erro || 'Não foi possível criar o usuário.')
            return
        }

        showSuccess('Usuário criado com sucesso!')
        setForm({ nome: '', email: '', senha: '', perfil: 'operador' })
        setCriando(false)
        carregarUsuarios()
    }

    async function handleRemover(usuario) {
        const confirmado = await confirm(`Tem certeza que deseja remover "${usuario.nome}"?`)
        if (!confirmado) return

        const { data: { session } } = await supabase.auth.getSession()
        const resposta = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-usuario`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ id: usuario.id })
            }
        )
        const resultado = await resposta.json()
        if (!resultado.ok) {
            showError(resultado.erro || 'Não foi possível remover o usuário.')
            return
        }
        showSuccess('Usuário removido com sucesso!')
        carregarUsuarios()
    }

    async function handleAlterarPerfil(usuario, novoPerfil) {
        await supabase.from('perfis').update({ perfil: novoPerfil }).eq('id', usuario.id)
        carregarUsuarios()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">Usuários</h1>
                    <p className="text-gray-400 mt-1">Gerencie quem tem acesso ao sistema</p>
                </div>
                <button
                    onClick={() => setCriando(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <UserPlus size={18} />
                    Novo Usuário
                </button>
            </div>

            {criando && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
                    <h2 className="text-gray-100 font-semibold">Novo Usuário</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-gray-400 text-sm">Nome</label>
                            <input
                                type="text"
                                value={form.nome}
                                onChange={e => setForm({ ...form, nome: e.target.value })}
                                className="w-full mt-1 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                placeholder="Nome completo"
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm">E-mail</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="w-full mt-1 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                placeholder="email@exemplo.com"
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm">Senha</label>
                            <div className="relative mt-1">
                                <input
                                    type={mostrarSenha ? 'text' : 'password'}
                                    value={form.senha}
                                    onChange={e => setForm({ ...form, senha: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:border-blue-500"
                                    placeholder="Mínimo 6 caracteres"
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
                        <div>
                            <label className="text-gray-400 text-sm">Perfil</label>
                            <select
                                value={form.perfil}
                                onChange={e => setForm({ ...form, perfil: e.target.value })}
                                className="w-full mt-1 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            >
                                <option value="operador">Operador</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => setCriando(false)}
                            className="px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCriar}
                            disabled={salvando}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                        >
                            {salvando ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Criando...
                                </>
                            ) : (
                                'Criar Usuário'
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-gray-100 font-semibold">Usuários Cadastrados</h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Carregando...</div>
                ) : (
                    <div className="divide-y divide-gray-700">
                        {usuarios.map(usuario => (
                            <div key={usuario.id} className="flex items-center gap-4 px-4 py-3">
                                <div className={`p-2 rounded-full ${usuario.perfil === 'admin' ? 'bg-blue-600/20' : 'bg-gray-700'}`}>
                                    {usuario.perfil === 'admin'
                                        ? <Shield size={18} className="text-blue-400" />
                                        : <User size={18} className="text-gray-400" />
                                    }
                                </div>
                                <div className="flex-1">
                                    <p className="text-gray-100 font-medium">{usuario.nome}</p>
                                    <p className="text-gray-400 text-sm">{usuario.email}</p>
                                </div>
                                <select
                                    value={usuario.perfil}
                                    onChange={e => handleAlterarPerfil(usuario, e.target.value)}
                                    className="bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                                >
                                    <option value="operador">Operador</option>
                                    <option value="admin">Administrador</option>
                                </select>
                                <button
                                    onClick={() => handleRemover(usuario)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}