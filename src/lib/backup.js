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

export async function gerarBackup() {
    try {
        const dados = {}

        for (const tabela of TABELAS) {
            const { data, error } = await supabase.from(tabela).select('*')
            if (error) throw error
            dados[tabela] = data
        }

        dados._gerado_em = new Date().toISOString()

        const resultado = await window.electronAPI.salvarBackup(dados)
        return resultado
    } catch (e) {
        return { ok: false, erro: e.message }
    }
}

export async function restaurarBackup(caminho) {
    try {
        const { ok, dados, erro } = await window.electronAPI.lerBackup(caminho)
        if (!ok) throw new Error(erro)

        // Apaga tudo na ordem correta (filhos antes dos pais)
        const ordemDelecao = [
            'itens_venda',
            'itens_orcamento',
            'itens_pedido',
            'vendas',
            'orcamentos',
            'pedidos',
            'entradas',
            'perdas',
            'materiais',
            'clientes',
            'fornecedores',
        ]

        for (const tabela of ordemDelecao) {
            await supabase.from(tabela).delete().neq('id', '00000000-0000-0000-0000-000000000000')
        }

        // Reinsere na ordem correta (pais antes dos filhos)
        const ordemInsercao = [
            'fornecedores',
            'clientes',
            'materiais',
            'vendas',
            'orcamentos',
            'pedidos',
            'entradas',
            'perdas',
            'itens_venda',
            'itens_orcamento',
            'itens_pedido',
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