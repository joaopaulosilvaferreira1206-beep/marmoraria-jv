/**
 * Camada de serviço — TODA lógica Supabase passa por aqui.
 *
 * Padrão obrigatório para todas as funções:
 *   - Retornam { data, error } — nunca lançam exceção diretamente
 *   - Pages só chamam funções daqui, nunca importam supabase diretamente
 *
 * @example
 *   const { data, error } = await materiais.listar()
 *   if (error) { showPopup(error.message, 'error'); return }
 */

import { supabase } from '../lib/supabase'

export const materiais = {
  listar: () =>
    supabase.from('materiais').select('*').order('descricao'),

  buscarPorId: (id) =>
    supabase.from('materiais').select('*').eq('id', id).single(),

  criar: (dados) =>
    supabase.from('materiais').insert(dados).select().single(),

  atualizar: (id, dados) =>
    supabase.from('materiais').update(dados).eq('id', id).select().single(),

  excluir: (id) =>
    supabase.from('materiais').delete().eq('id', id),
}

export const vendas = {
  listar: () =>
    supabase.from('vendas').select('*, clientes(nome)').order('criado_em', { ascending: false }),

  listarComItens: (id) =>
    supabase.from('vendas').select('*, clientes(nome), itens_venda(*)').eq('id', id).single(),

  criar: (dados) =>
    supabase.from('vendas').insert(dados).select().single(),

  atualizar: (id, dados) =>
    supabase.from('vendas').update(dados).eq('id', id).select().single(),

  excluir: (id) =>
    supabase.from('vendas').delete().eq('id', id),
}

export const clientes = {
  listar: () =>
    supabase.from('clientes').select('*').order('nome'),

  criar: (dados) =>
    supabase.from('clientes').insert(dados).select().single(),

  atualizar: (id, dados) =>
    supabase.from('clientes').update(dados).eq('id', id).select().single(),

  excluir: (id) =>
    supabase.from('clientes').delete().eq('id', id),
}

export const orcamentos = {
  listar: () =>
    supabase.from('orcamentos').select('*, clientes(nome), itens_orcamento(*)').order('criado_em', { ascending: false }),

  criar: (dados) =>
    supabase.from('orcamentos').insert(dados).select().single(),

  atualizar: (id, dados) =>
    supabase.from('orcamentos').update(dados).eq('id', id).select().single(),

  excluir: (id) =>
    supabase.from('orcamentos').delete().eq('id', id),
}

export const fornecedores = {
  listar: () =>
    supabase.from('fornecedores').select('*').order('nome'),

  criar: (dados) =>
    supabase.from('fornecedores').insert(dados).select().single(),

  atualizar: (id, dados) =>
    supabase.from('fornecedores').update(dados).eq('id', id).select().single(),

  excluir: (id) =>
    supabase.from('fornecedores').delete().eq('id', id),
}
