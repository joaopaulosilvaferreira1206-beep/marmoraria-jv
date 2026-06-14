import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  C, W, MRG, ALT_CAB,
  novoDoc, carregarLogo,
  desenharCabecalho, TABLE_STYLES, aplicarRodapes,
} from './pdfBase'

// ─── Helper interno: doc com cabeçalho já desenhado ──────────────────────────
async function iniciarDoc(tituloSecao, subtitulo = '') {
  const doc  = novoDoc()
  const logo = await carregarLogo()
  desenharCabecalho(doc, logo)

  let y = ALT_CAB + 5

  // Título do relatório
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...C.AZUL_ESC)
  doc.text(tituloSecao, W / 2, y + 5, { align: 'center' })
  y += 8

  if (subtitulo) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.TEXTO_SEC)
    doc.text(subtitulo, W / 2, y + 4, { align: 'center' })
    y += 7
  }

  // Linha separadora
  doc.setDrawColor(...C.AZUL)
  doc.setLineWidth(0.5)
  doc.line(MRG, y + 2, W - MRG, y + 2)
  y += 7

  return { doc, y }
}

// ─── Relatório de Vendas ─────────────────────────────────────────────────────
export async function exportarVendasPDF(vendas, periodo = '') {
  const { doc, y } = await iniciarDoc('RELATÓRIO DE VENDAS', periodo)

  const total = vendas.reduce((a, v) => a + (v.valor_total || 0), 0)
  const qtd   = vendas.length

  // KPIs resumo
  const boxW = (W - MRG * 2 - 8) / 2
  doc.setFillColor(...C.AZUL_CLARO)
  doc.roundedRect(MRG, y, boxW, 12, 1.5, 1.5, 'F')
  doc.setFillColor(...C.AZUL)
  doc.roundedRect(MRG + boxW + 8, y, boxW, 12, 1.5, 1.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...C.AZUL_ESC)
  doc.text('TOTAL DE VENDAS', MRG + boxW / 2, y + 4.5, { align: 'center' })
  doc.setFontSize(11)
  doc.text(`${qtd} venda${qtd !== 1 ? 's' : ''}`, MRG + boxW / 2, y + 10, { align: 'center' })

  doc.setFontSize(7)
  doc.setTextColor(...C.BRANCO)
  doc.text('VALOR TOTAL', MRG + boxW + 8 + boxW / 2, y + 4.5, { align: 'center' })
  doc.setFontSize(11)
  doc.text(
    `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    MRG + boxW + 8 + boxW / 2, y + 10, { align: 'center' }
  )

  // Tabela
  autoTable(doc, {
    startY: y + 17,
    ...TABLE_STYLES,
    head: [['Data', 'Cliente', 'Tipo', 'Pagamento', 'Valor (R$)']],
    body: vendas.map(v => [
      new Date(v.data).toLocaleDateString('pt-BR'),
      v.clientes?.nome || '—',
      v.tipo_trabalho   || '—',
      v.forma_pagamento || '—',
      Number(v.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    ]),
    foot: [['', '', '', 'TOTAL', `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]],
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 36 },
      3: { cellWidth: 32 },
      4: { cellWidth: 32, halign: 'right' },
    },
  })

  aplicarRodapes(doc)
  doc.save(`Relatorio_Vendas${periodo ? '_' + periodo.replace(/\s*\/\s*/g, '-') : ''}.pdf`)
}

// ─── Relatório de Estoque ────────────────────────────────────────────────────
export async function exportarEstoquePDF(materiais) {
  const { doc, y } = await iniciarDoc(
    'RELATÓRIO DE ESTOQUE',
    `Gerado em ${new Date().toLocaleDateString('pt-BR')}`
  )

  // KPIs
  const totalItens   = materiais.length
  const totalValor   = materiais.reduce((a, m) => a + (m.valor_total || 0), 0)
  const criticos     = materiais.filter(m => m.minimo !== null && (m.saldo ?? 0) <= m.minimo).length

  const boxW = (W - MRG * 2 - 16) / 3
  const kpis = [
    { label: 'ITENS CADASTRADOS', valor: totalItens, cor: C.AZUL_CLARO, txt: C.AZUL_ESC },
    { label: 'VALOR DO ESTOQUE',  valor: `R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, cor: C.AZUL, txt: C.BRANCO },
    { label: 'ITENS CRÍTICOS',    valor: criticos,   cor: criticos > 0 ? [220, 38, 38] : [0, 153, 51], txt: C.BRANCO },
  ]

  kpis.forEach((k, i) => {
    const x = MRG + i * (boxW + 8)
    doc.setFillColor(...k.cor)
    doc.roundedRect(x, y, boxW, 12, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...k.txt)
    doc.text(k.label, x + boxW / 2, y + 4.5, { align: 'center' })
    doc.setFontSize(10)
    doc.text(String(k.valor), x + boxW / 2, y + 10, { align: 'center' })
  })

  autoTable(doc, {
    startY: y + 17,
    ...TABLE_STYLES,
    head: [['SKU', 'Descrição', 'Saldo', 'Mín.', 'Máx.', 'Vlr. Médio', 'Vlr. Total', 'Un.']],
    body: materiais.map(m => {
      const critico = m.minimo !== null && (m.saldo ?? 0) <= m.minimo
      return [
        m.sku,
        m.descricao,
        { content: m.saldo ?? 0, styles: critico ? { textColor: [220, 38, 38], fontStyle: 'bold' } : {} },
        m.minimo ?? '—',
        m.maximo ?? '—',
        `R$ ${(m.valor_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(m.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        m.unidade,
      ]
    }),
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 14, halign: 'right' },
      4: { cellWidth: 14, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
      6: { cellWidth: 26, halign: 'right' },
      7: { cellWidth: 14, halign: 'center' },
    },
  })

  aplicarRodapes(doc)
  doc.save(`Relatorio_Estoque_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`)
}

// ─── Relatório de Clientes ───────────────────────────────────────────────────
export async function exportarClientesPDF(clientes) {
  const { doc, y } = await iniciarDoc(
    'RELATÓRIO DE CLIENTES',
    `Total: ${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} cadastrado${clientes.length !== 1 ? 's' : ''}`
  )

  autoTable(doc, {
    startY: y,
    ...TABLE_STYLES,
    head: [['#', 'Nome', 'Telefone', 'E-mail', 'Endereço']],
    body: clientes.map((c, i) => [
      i + 1,
      c.nome,
      c.telefone || '—',
      c.email    || '—',
      c.endereco || '—',
    ]),
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 42 },
      2: { cellWidth: 28 },
      3: { cellWidth: 40 },
      4: { cellWidth: 'auto' },
    },
  })

  aplicarRodapes(doc)
  doc.save(`Relatorio_Clientes_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`)
}

// ─── EXCEL (sem alteração de lógica, mantidos) ───────────────────────────────
export function exportarVendasExcel(vendas, periodo = '') {
  const dados = vendas.map(v => ({
    'Data':               new Date(v.data).toLocaleDateString('pt-BR'),
    'Cliente':            v.clientes?.nome || '—',
    'Tipo de Trabalho':   v.tipo_trabalho  || '—',
    'Forma de Pagamento': v.forma_pagamento || '—',
    'Valor Total (R$)':   v.valor_total || 0,
    'Observação':         v.observacao  || '—',
  }))
  const ws = XLSX.utils.json_to_sheet(dados)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Vendas')
  XLSX.writeFile(wb, `Vendas${periodo ? '_' + periodo : ''}.xlsx`)
}

export function exportarEstoqueExcel(materiais) {
  const dados = materiais.map(m => ({
    'SKU':             m.sku,
    'Descrição':       m.descricao,
    'Saldo':           m.saldo ?? 0,
    'Mínimo':          m.minimo ?? 0,
    'Máximo':          m.maximo ?? 0,
    'Valor Médio (R$)':m.valor_medio || 0,
    'Valor Total (R$)':m.valor_total || 0,
    'Unidade':         m.unidade,
  }))
  const ws = XLSX.utils.json_to_sheet(dados)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Estoque')
  XLSX.writeFile(wb, `Estoque_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.xlsx`)
}

export function exportarClientesExcel(clientes) {
  const dados = clientes.map(c => ({
    'Nome':      c.nome,
    'Telefone':  c.telefone || '—',
    'Email':     c.email    || '—',
    'Endereço':  c.endereco || '—',
  }))
  const ws = XLSX.utils.json_to_sheet(dados)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
  XLSX.writeFile(wb, `Clientes_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.xlsx`)
}
