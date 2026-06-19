import { supabase } from './supabase'

const TABELAS = [
    'fornecedores',
    'clientes',
    'materiais',
    'vendas',
    'itens_venda',
    'entradas',
    'perdas',
    'pedidos',
    'itens_pedido',
    'orcamentos',
    'itens_orcamento',
]

const ORDEM_INSERCAO = [
    'fornecedores', 'clientes', 'materiais',
    'vendas', 'orcamentos', 'pedidos',
    'entradas', 'perdas',
    'itens_venda', 'itens_orcamento', 'itens_pedido',
]

const ORDEM_DELECAO = [...ORDEM_INSERCAO].reverse()

async function buscarTabela(tabela) {
    const { data, error } = await supabase.from(tabela).select('*')
    if (error) throw new Error(`Erro ao ler ${tabela}: ${error.message}`)
    return data ?? []
}

async function coletarDados() {
    const resultados = await Promise.all(TABELAS.map(t => buscarTabela(t).then(d => [t, d])))
    const dados = { _gerado_em: new Date().toISOString() }
    for (const [t, d] of resultados) dados[t] = d
    return dados
}

export async function gerarBackup() {
    try {
        const dados = await coletarDados()
        if (window.electronAPI) {
            return await window.electronAPI.salvarBackup(dados)
        }
        const { error } = await supabase.from('backups_nuvem').insert({ dados })
        if (error) throw error
        const { data: lista } = await supabase
            .from('backups_nuvem')
            .select('id, criado_em')
            .order('criado_em', { ascending: false })
        if (lista && lista.length > 30) {
            const ids = lista.slice(30).map(b => b.id)
            await supabase.from('backups_nuvem').delete().in('id', ids)
        }
        return { ok: true }
    } catch (e) {
        return { ok: false, erro: e.message }
    }
}

export async function listarBackupsNuvem() {
    const { data, error } = await supabase
        .from('backups_nuvem')
        .select('id, criado_em')
        .order('criado_em', { ascending: false })
    if (error) return []
    return data || []
}

export async function excluirBackupNuvem(id) {
    const { error } = await supabase.from('backups_nuvem').delete().eq('id', id)
    if (error) return { ok: false, erro: error.message }
    return { ok: true }
}

export async function restaurarBackupNuvem(id) {
    try {
        const { data, error } = await supabase
            .from('backups_nuvem')
            .select('dados')
            .eq('id', id)
            .single()
        if (error) throw error
        return restaurarDados(data.dados)
    } catch (e) {
        return { ok: false, erro: e.message }
    }
}

export async function carregarDadosBackup(origem) {
    const { data, error } = await supabase
        .from('backups_nuvem')
        .select('dados')
        .eq('id', origem.id)
        .single()
    if (error) throw error
    return data.dados
}

export async function restaurarSeletivo(registrosPorTabela) {
    try {
        for (const tabela of ORDEM_INSERCAO) {
            const registros = registrosPorTabela[tabela]
            if (!registros?.length) continue
            const { error } = await supabase
                .from(tabela)
                .upsert(registros, { onConflict: 'id' })
            if (error) throw error
        }
        return { ok: true }
    } catch (e) {
        return { ok: false, erro: e.message }
    }
}

export async function restaurarBackup(caminho) {
    try {
        const { ok, dados, erro } = await window.electronAPI.lerBackup(caminho)
        if (!ok) throw new Error(erro)
        return restaurarDados(dados)
    } catch (e) {
        return { ok: false, erro: e.message }
    }
}

async function restaurarDados(dados) {
    const tabelasValidas = TABELAS.filter(t => Array.isArray(dados[t]))
    if (tabelasValidas.length === 0) {
        return { ok: false, erro: 'Backup inválido: nenhuma tabela reconhecida.' }
    }

    try {
        for (const tabela of ORDEM_DELECAO) {
            const { error } = await supabase
                .from(tabela)
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000')
            if (error) throw new Error(`Erro ao limpar ${tabela}: ${error.message}`)
        }
        for (const tabela of ORDEM_INSERCAO) {
            if (!dados[tabela]?.length) continue
            const { error } = await supabase.from(tabela).insert(dados[tabela])
            if (error) throw new Error(`Erro ao restaurar ${tabela}: ${error.message}`)
        }
        return { ok: true }
    } catch (e) {
        return { ok: false, erro: e.message }
    }
}
