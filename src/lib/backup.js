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

async function coletarDados() {
    const dados = {}
    for (const tabela of TABELAS) {
        const { data, error } = await supabase.from(tabela).select('*')
        if (error) throw error
        dados[tabela] = data
    }
    dados._gerado_em = new Date().toISOString()
    return dados
}

export async function gerarBackup() {
    try {
        const dados = await coletarDados()
        if (window.electronAPI) {
            return await window.electronAPI.salvarBackup(dados)
        }
        // Nuvem: salva no Supabase
        const { error } = await supabase.from('backups_nuvem').insert({ dados })
        if (error) throw error
        // Manter só os 30 mais recentes
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
    if (origem.tipo === 'nuvem') {
        const { data, error } = await supabase
            .from('backups_nuvem')
            .select('dados')
            .eq('id', origem.id)
            .single()
        if (error) throw error
        return data.dados
    }
    const { ok, dados, erro } = await window.electronAPI.lerBackup(origem.caminho)
    if (!ok) throw new Error(erro)
    return dados
}

// registrosPorTabela: { clientes: [rec, ...], materiais: [rec, ...], ... }
export async function restaurarSeletivo(registrosPorTabela) {
    const ORDEM_INSERCAO = [
        'fornecedores', 'clientes', 'materiais',
        'vendas', 'orcamentos', 'pedidos',
        'entradas', 'perdas',
        'itens_venda', 'itens_orcamento', 'itens_pedido',
    ]
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
    try {
        const ordemDelecao = [
            'itens_venda', 'itens_orcamento', 'itens_pedido',
            'vendas', 'orcamentos', 'pedidos',
            'entradas', 'perdas', 'materiais', 'clientes', 'fornecedores',
        ]
        for (const tabela of ordemDelecao) {
            await supabase.from(tabela).delete().neq('id', '00000000-0000-0000-0000-000000000000')
        }
        const ordemInsercao = [
            'fornecedores', 'clientes', 'materiais',
            'vendas', 'orcamentos', 'pedidos',
            'entradas', 'perdas',
            'itens_venda', 'itens_orcamento', 'itens_pedido',
        ]
        for (const tabela of ordemInsercao) {
            if (dados[tabela]?.length > 0) {
                const { error } = await supabase.from(tabela).insert(dados[tabela])
                if (error) throw error
            }
        }
        return { ok: true }
    } catch (e) {
        return { ok: false, erro: e.message }
    }
}
