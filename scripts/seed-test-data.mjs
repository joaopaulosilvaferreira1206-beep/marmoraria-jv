// Script único de seed para popular 1 ano de dados de TESTE no banco de produção.
// Todos os registros são marcados com prefixo "[TESTE]" para poderem ser identificados e removidos depois.
// Uso: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-test-data.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zwexvgzhrcnwsuciwdwx.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY no ambiente antes de rodar este script.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const PREFIXO = '[TESTE]'
const HOJE = new Date('2026-06-17')
const INICIO = new Date('2025-06-17')

function dataAleatoria(inicio, fim) {
  const t = inicio.getTime() + Math.random() * (fim.getTime() - inicio.getTime())
  return new Date(t)
}

function isoData(d) {
  return d.toISOString().split('T')[0]
}

function aleatorioEntre(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100
}

function escolher(lista) {
  return lista[Math.floor(Math.random() * lista.length)]
}

async function criarClientes() {
  const nomes = [
    `${PREFIXO} Cliente Demo 1`,
    `${PREFIXO} Cliente Demo 2`,
    `${PREFIXO} Cliente Demo 3`,
  ]
  const { data, error } = await supabase
    .from('clientes')
    .insert(nomes.map((nome) => ({ nome, telefone: '(00) 00000-0000', email: null, endereco: null })))
    .select()
  if (error) throw error
  return data
}

async function criarMateriais() {
  const { data: ultimo, error: errUltimo } = await supabase
    .from('materiais')
    .select('sku')
    .order('sku', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (errUltimo) throw errUltimo
  let sku = (ultimo?.sku || 0) + 1

  const defs = [
    { descricao: `${PREFIXO} Granito Preto`, valor_medio: 350, saldo: 1000, minimo: 50, unidade: 'M²' },
    { descricao: `${PREFIXO} Mármore Branco`, valor_medio: 480, saldo: 1000, minimo: 50, unidade: 'M²' },
    { descricao: `${PREFIXO} Quartzo Cinza`, valor_medio: 600, saldo: 1000, minimo: 50, unidade: 'M²' },
  ]
  const { data, error } = await supabase
    .from('materiais')
    .insert(defs.map((d) => ({ ...d, sku: sku++, valor_total: d.valor_medio * d.saldo })))
    .select()
  if (error) throw error
  return data
}

async function criarVendas(clientes, materiais) {
  const formas = ['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'A prazo']
  let totalVendas = 0
  let totalItens = 0
  for (let mes = 0; mes < 12; mes++) {
    const nVendas = Math.floor(aleatorioEntre(3, 8))
    for (let i = 0; i < nVendas; i++) {
      const inicioMes = new Date(INICIO.getFullYear(), INICIO.getMonth() + mes, 1)
      const fimMes = new Date(INICIO.getFullYear(), INICIO.getMonth() + mes + 1, 0)
      const data = dataAleatoria(inicioMes, fimMes < HOJE ? fimMes : HOJE)

      const nItens = Math.floor(aleatorioEntre(1, 3))
      const itens = Array.from({ length: nItens }, () => {
        const material = escolher(materiais)
        const quantidade = aleatorioEntre(1, 10)
        const valor_unitario = Math.round(material.valor_medio * aleatorioEntre(1.2, 1.6))
        return { material_id: material.id, quantidade, valor_unitario }
      })
      const valor_total = itens.reduce((acc, it) => acc + it.quantidade * it.valor_unitario, 0)

      const { data: venda, error: errVenda } = await supabase
        .from('vendas')
        .insert({
          cliente_id: escolher(clientes).id,
          data: isoData(data),
          forma_pagamento: escolher(formas),
          observacao: `${PREFIXO} venda gerada para teste`,
          valor_total,
        })
        .select()
        .single()
      if (errVenda) throw errVenda

      const { error: errItens } = await supabase
        .from('itens_venda')
        .insert(itens.map((it) => ({ ...it, venda_id: venda.id })))
      if (errItens) throw errItens

      totalVendas++
      totalItens += itens.length
    }
  }
  return { totalVendas, totalItens }
}

async function criarPerdas(materiais) {
  const motivos = ['quebra no transporte', 'corte incorreto', 'defeito na chapa', 'queda no manuseio']
  let total = 0
  for (let mes = 0; mes < 12; mes++) {
    const nPerdas = Math.floor(aleatorioEntre(1, 3))
    for (let i = 0; i < nPerdas; i++) {
      const inicioMes = new Date(INICIO.getFullYear(), INICIO.getMonth() + mes, 1)
      const fimMes = new Date(INICIO.getFullYear(), INICIO.getMonth() + mes + 1, 0)
      const data = dataAleatoria(inicioMes, fimMes < HOJE ? fimMes : HOJE)
      const { error } = await supabase.from('perdas').insert({
        material_id: escolher(materiais).id,
        quantidade: aleatorioEntre(0.5, 3),
        data: isoData(data),
        motivo: `${PREFIXO} ${escolher(motivos)}`,
      })
      if (error) throw error
      total++
    }
  }
  return total
}

async function criarOrcamentos(clientes, materiais) {
  const statusList = ['pendente', 'aprovado', 'recusado', 'convertido']
  const formas = ['Dinheiro', 'PIX', 'Cartão de Crédito', 'A prazo']
  let total = 0
  for (let mes = 0; mes < 12; mes++) {
    const nOrcs = Math.floor(aleatorioEntre(3, 6))
    for (let i = 0; i < nOrcs; i++) {
      const inicioMes = new Date(INICIO.getFullYear(), INICIO.getMonth() + mes, 1)
      const fimMes = new Date(INICIO.getFullYear(), INICIO.getMonth() + mes + 1, 0)
      const data = dataAleatoria(inicioMes, fimMes < HOJE ? fimMes : HOJE)
      const validade = new Date(data.getTime() + 15 * 86400000)

      const nItens = Math.floor(aleatorioEntre(1, 3))
      const itens = Array.from({ length: nItens }, () => {
        const material = escolher(materiais)
        const quantidade = aleatorioEntre(1, 8)
        const valor_unitario = Math.round(material.valor_medio * aleatorioEntre(1.2, 1.6))
        return { material_id: material.id, quantidade, valor_unitario }
      })
      const valor_total = itens.reduce((acc, it) => acc + it.quantidade * it.valor_unitario, 0)

      const { data: orc, error: errOrc } = await supabase
        .from('orcamentos')
        .insert({
          cliente_id: escolher(clientes).id,
          data: isoData(data),
          validade: isoData(validade),
          forma_pagamento: escolher(formas),
          observacao: `${PREFIXO} orçamento gerado para teste`,
          valor_total,
          status: escolher(statusList),
        })
        .select()
        .single()
      if (errOrc) throw errOrc

      const { error: errItens } = await supabase
        .from('itens_orcamento')
        .insert(itens.map((it) => ({ ...it, orcamento_id: orc.id })))
      if (errItens) throw errItens

      total++
    }
  }
  return total
}

async function main() {
  console.log('Criando clientes de teste...')
  const clientes = await criarClientes()
  console.log(`  ${clientes.length} clientes criados.`)

  console.log('Criando materiais de teste...')
  const materiais = await criarMateriais()
  console.log(`  ${materiais.length} materiais criados.`)

  console.log('Gerando vendas (12 meses)...')
  const { totalVendas, totalItens } = await criarVendas(clientes, materiais)
  console.log(`  ${totalVendas} vendas / ${totalItens} itens criados.`)

  console.log('Gerando perdas (12 meses)...')
  const totalPerdas = await criarPerdas(materiais)
  console.log(`  ${totalPerdas} perdas criadas.`)

  console.log('Gerando orçamentos (12 meses)...')
  const totalOrcamentos = await criarOrcamentos(clientes, materiais)
  console.log(`  ${totalOrcamentos} orçamentos criados.`)

  console.log('\nConcluído. Todos os registros têm o prefixo "[TESTE]" em nome/descrição/observação/motivo.')
}

main().catch((err) => {
  console.error('Erro ao popular dados de teste:', err)
  process.exit(1)
})
