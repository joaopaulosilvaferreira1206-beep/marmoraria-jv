import autoTable from 'jspdf-autotable'
import {
  C, EMPRESA, W, MRG, ALT_CAB,
  novoDoc, carregarLogo, carregarImagemBase64,
  desenharCabecalho, secaoTitulo, TABLE_STYLES, aplicarRodapes,
} from './pdfBase'

const IMG_SZ = 16

export async function gerarPDFOrcamento(orcamento, itens, cliente) {
  const doc = novoDoc()

  // Carrega logo e fotos dos itens em paralelo
  const [logo, ...fotos] = await Promise.all([
    carregarLogo(),
    ...itens.map(i => carregarImagemBase64(i.imagem_url)),
  ])

  // ── CABEÇALHO ────────────────────────────────────────────────────────────
  desenharCabecalho(doc, logo)

  // ── TÍTULO DO DOCUMENTO ───────────────────────────────────────────────────
  const numOrc  = orcamento.id?.slice(0, 8).toUpperCase() || '--------'
  const dataOrc = orcamento.data
    ? new Date(orcamento.data + 'T12:00:00').toLocaleDateString('pt-BR')
    : '—'
  const validade = orcamento.validade
    ? new Date(orcamento.validade + 'T12:00:00').toLocaleDateString('pt-BR')
    : '—'

  let y = ALT_CAB + 4

  // Caixa do título
  doc.setFillColor(...C.AZUL_CLARO)
  doc.roundedRect(MRG, y, W - MRG * 2, 9, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...C.AZUL_ESC)
  doc.text(`ORÇAMENTO  Nº ${numOrc}`, W / 2, y + 6.2, { align: 'center' })
  y += 13

  // Faixa de info (data / validade / pagamento)
  doc.setFillColor(...C.CINZA)
  doc.rect(MRG, y, W - MRG * 2, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...C.TEXTO_SEC)
  doc.text(`Data: ${dataOrc}`,                      MRG + 3, y + 4.8)
  doc.text(`Validade: ${validade}`,                  W / 2,   y + 4.8, { align: 'center' })
  doc.text(`Pagamento: ${orcamento.forma_pagamento || '—'}`, W - MRG - 3, y + 4.8, { align: 'right' })
  y += 11

  // ── 1. DADOS DO CLIENTE ───────────────────────────────────────────────────
  y = secaoTitulo(doc, '1', 'DADOS DO CLIENTE', y) + 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.TEXTO)

  const col2 = W / 2
  doc.setFont('helvetica', 'bold')
  doc.text('Cliente:', MRG + 2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(cliente?.nome || '—', MRG + 18, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Telefone:', MRG + 2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(cliente?.telefone || '—', MRG + 20, y)

  doc.setFont('helvetica', 'bold')
  doc.text('E-mail:', col2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(cliente?.email || '—', col2 + 14, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Endereço:', MRG + 2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(cliente?.endereco || '—', MRG + 21, y)
  y += 10

  // ── 2. PRODUTOS / SERVIÇOS ────────────────────────────────────────────────
  y = secaoTitulo(doc, '2', 'PRODUTOS / SERVIÇOS', y) + 2

  autoTable(doc, {
    startY: y,
    ...TABLE_STYLES,
    head: [['Foto', 'Descrição', 'Tipo de Trabalho', 'Qtd (m²)', 'Unit. (R$)', 'Subtotal (R$)']],
    body: itens.map(item => [
      '',
      item.descricao,
      item.tipo_trabalho || '—',
      Number(item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      Number(item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      (Number(item.quantidade) * Number(item.valor_unitario)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    ]),
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 34 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    bodyStyles: { ...TABLE_STYLES.bodyStyles, minCellHeight: IMG_SZ + 6 },
    didDrawCell(data) {
      if (data.section !== 'body' || data.column.index !== 0) return
      const img = fotos[data.row.index]
      const cx  = data.cell.x + 2
      const cy  = data.cell.y + 2
      const sz  = IMG_SZ - 2
      if (img) {
        doc.addImage(img, 'JPEG', cx, cy, sz, sz)
      } else {
        doc.setFillColor(210, 210, 210)
        doc.rect(cx, cy, sz, sz, 'F')
        doc.setFontSize(5.5)
        doc.setTextColor(140, 140, 140)
        doc.text('Sem foto', cx + sz / 2, cy + sz / 2, { align: 'center' })
      }
    },
  })

  // ── 3. TOTALIZADORES ─────────────────────────────────────────────────────
  y = doc.lastAutoTable.finalY + 5

  const totalM2  = itens.reduce((a, i) => a + Number(i.quantidade), 0)
  const total    = itens.reduce((a, i) => a + Number(i.quantidade) * Number(i.valor_unitario), 0)

  // Caixa totalizadora
  doc.setFillColor(...C.AZUL_CLARO)
  doc.roundedRect(MRG, y, W - MRG * 2, 14, 1.5, 1.5, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.TEXTO_SEC)
  doc.text(`${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`, MRG + 4, y + 5.5)
  doc.text(`${totalM2.toFixed(2)} m²`, MRG + 4, y + 10.5)

  doc.setDrawColor(...C.AZUL)
  doc.setLineWidth(0.5)
  doc.line(W - MRG - 75, y + 2, W - MRG - 75, y + 12)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.AZUL_ESC)
  doc.text('TOTAL GERAL', W - MRG - 70, y + 6.5)
  doc.setFontSize(13)
  doc.setTextColor(...C.AZUL)
  doc.text(
    `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    W - MRG - 4, y + 10.5, { align: 'right' }
  )
  y += 19

  // ── 4. FORMA DE PAGAMENTO ─────────────────────────────────────────────────
  if (orcamento.forma_pagamento) {
    y = secaoTitulo(doc, '3', 'FORMA DE PAGAMENTO', y) + 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.TEXTO)
    doc.text(orcamento.forma_pagamento, MRG + 3, y)
    y += 8
  }

  // ── 5. OBSERVAÇÕES ────────────────────────────────────────────────────────
  if (orcamento.observacao) {
    const num = orcamento.forma_pagamento ? '4' : '3'
    y = secaoTitulo(doc, num, 'OBSERVAÇÕES', y) + 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.TEXTO)
    const linhas = doc.splitTextToSize(orcamento.observacao, W - MRG * 2 - 4)
    doc.text(linhas, MRG + 3, y)
    y += linhas.length * 5 + 6
  }

  // ── DECLARAÇÃO ───────────────────────────────────────────────────────────
  y += 6
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.TEXTO_SEC)
  const decl = 'Declaro ter conferido a quantidade e as condições dos produtos/serviços entregues, dando plena quitação do feito, para mais nada reclamar.'
  doc.text(doc.splitTextToSize(decl, W - MRG * 2), MRG, y)

  // ── ASSINATURAS ──────────────────────────────────────────────────────────
  y = Math.max(y + 18, 248)
  doc.setDrawColor(...C.TEXTO_SEC)
  doc.setLineWidth(0.3)

  doc.line(MRG, y, MRG + 72, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.TEXTO_SEC)
  doc.text('Assinatura do Cliente', MRG, y + 4)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.TEXTO)
  doc.text(cliente?.nome || '', MRG, y + 8)

  doc.line(W - MRG - 80, y, W - MRG, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.TEXTO_SEC)
  doc.text('Assinatura / Carimbo da Empresa', W - MRG - 80, y + 4)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.TEXTO)
  doc.text(EMPRESA.razao,            W - MRG - 80, y + 8)
  doc.text(`CNPJ: ${EMPRESA.cnpj}`, W - MRG - 80, y + 12)

  // ── RODAPÉS ──────────────────────────────────────────────────────────────
  aplicarRodapes(doc)

  doc.save(`Orcamento_${numOrc}_${(cliente?.nome || 'cliente').replace(/\s+/g, '_')}.pdf`)
}
