import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
    const [sessao, setSessao] = useState(null)
    const [perfil, setPerfil] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSessao(session)
            // eslint-disable-next-line react-hooks/immutability
            if (session) carregarPerfil(session.user.id)
            else setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSessao(session)
            if (session) carregarPerfil(session.user.id)
            else {
                setPerfil(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    async function carregarPerfil(userId) {
        const { data } = await supabase
            .from('perfis')
            .select('*')
            .eq('id', userId)
            .single()
        setPerfil(data)
        setLoading(false)
    }

    async function logout() {
        await supabase.auth.signOut()
    }

    // Verificadores de permissão
    const isAdmin = perfil?.perfil === 'admin'

    const pode = {
        verRelatorios: isAdmin,
        apagarRegistros: isAdmin,
        acessarBackup: isAdmin,
        verCustos: true, // ambos podem ver
        gerenciarUsuarios: isAdmin,
    }

    return (
        <AuthContext.Provider value={{ sessao, perfil, loading, logout, isAdmin, pode }}>
            {children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext)
}