/**
 * pdfBase.js — identidade visual JV compartilhada por todos os PDFs
 *
 * Paleta:
 *   AZUL       #0066B3  cabeçalhos, barras, destaques
 *   AZUL_ESC   #003C78  texto títulos
 *   VERDE      #009933  faixa decorativa
 *   AZUL_CLARO #DCE8F6  fundos alternados / seções
 *   CINZA      #F5F5F5  linhas alternadas de tabela
 */

import jsPDF from 'jspdf'

// ─── Constantes ──────────────────────────────────────────────────────────────
export const C = {
  AZUL:        [0,  102, 179],
  AZUL_ESC:    [0,  40,  90],
  VERDE:       [0,  153, 51],
  AZUL_CLARO:  [220,232, 246],
  CINZA:       [245,245, 245],
  BRANCO:      [255,255, 255],
  TEXTO:       [30, 30,  30],
  TEXTO_SEC:   [90, 90,  90],
}

export const EMPRESA = {
  nome:     'MARCENARIA & MARMORARIA J.V.',
  sub1:     'Especializada na confecção de móveis e esquadrias em madeira e MDF;',
  sub2:     'Mármores e granitos em geral.',
  end:      'Rodovia Santos Dumont (em frente ao Aeroporto) — Bragança, PA',
  fone:     '(91) 3425-2208',
  cnpj:     '06.197.551/0001-73',
  razao:    'D DO SOCORRO R RIBEIRO LTDA',
}

export const W    = 210   // largura A4
export const MRG  = 14   // margem lateral
export const ALT_CAB = 38 // altura do cabeçalho

// ─── Logo (carrega uma vez, via fetch) ───────────────────────────────────────
export async function carregarLogo() {
  try {
    const url = new URL('../assets/logo-jv.png', import.meta.url).href
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function carregarImagemBase64(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ─── Cabeçalho ───────────────────────────────────────────────────────────────
export function desenharCabecalho(doc, logo) {
  // Fundo branco
  doc.setFillColor(...C.BRANCO)
  doc.rect(0, 0, W, ALT_CAB, 'F')

  // Logo
  if (logo) doc.addImage(logo, 'PNG', MRG, 4, 48, 27)

  // Texto empresa (lado direito)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  doc.setTextColor(...C.AZUL)
  doc.text(EMPRESA.nome, W - MRG, 10, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.TEXTO_SEC)
  doc.text(EMPRESA.sub1, W - MRG, 15.5, { align: 'right' })
  doc.text(EMPRESA.sub2, W - MRG, 19.5, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.TEXTO)
  doc.text(EMPRESA.end,  W - MRG, 24,   { align: 'right' })
  doc.text(`Fone: ${EMPRESA.fone}`,  W - MRG, 28,   { align: 'right' })

  // Faixa azul + verde
  doc.setFillColor(...C.AZUL)
  doc.rect(0, ALT_CAB - 2.4, W, 1.4, 'F')
  doc.setFillColor(...C.VERDE)
  doc.rect(0, ALT_CAB - 1, W, 1, 'F')
}

// ─── Rodapé (chama por página) ────────────────────────────────────────────────
export function desenharRodape(doc, pagAtual, pagTotal) {
  const pageH = 297
  const rodH  = 14

  doc.setFillColor(...C.AZUL)
  doc.rect(0, pageH - rodH, W, rodH, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...C.BRANCO)

  doc.text(
    `${EMPRESA.nome} — Fone: ${EMPRESA.fone} — ${EMPRESA.end}`,
    W / 2, pageH - rodH + 5, { align: 'center' }
  )
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    MRG, pageH - rodH + 10
  )
  if (pagTotal > 1) {
    doc.text(`Página ${pagAtual} / ${pagTotal}`, W - MRG, pageH - rodH + 10, { align: 'right' })
  }
}

// ─── Título de seção ─────────────────────────────────────────────────────────
export function secaoTitulo(doc, numero, texto, y) {
  doc.setFillColor(...C.AZUL)
  doc.rect(MRG, y, W - MRG * 2, 6.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.BRANCO)
  doc.text(`${numero}  ${texto}`, MRG + 3, y + 4.5)
  return y + 6.5
}

// ─── Badge de status ─────────────────────────────────────────────────────────
export function badge(doc, texto, x, y, tipo = 'info') {
  const cores = {
    aprovado:  { bg: [0, 153, 51],  fg: C.BRANCO },
    pendente:  { bg: [245, 158, 11], fg: C.BRANCO },
    cancelado: { bg: [220, 38, 38],  fg: C.BRANCO },
    info:      { bg: C.AZUL_CLARO,   fg: C.AZUL_ESC },
  }
  const { bg, fg } = cores[tipo] ?? cores.info
  const largura = doc.getTextWidth(texto) + 6
  doc.setFillColor(...bg)
  doc.roundedRect(x, y - 3.5, largura, 5, 1, 1, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...fg)
  doc.text(texto, x + 3, y)
  return x + largura + 3
}

// ─── Estilos padrão de tabela ─────────────────────────────────────────────────
export const TABLE_STYLES = {
  headStyles: {
    fillColor: C.AZUL_CLARO,
    textColor: C.AZUL_ESC,
    fontStyle: 'bold',
    fontSize: 8.5,
    lineWidth: 0,
  },
  bodyStyles: {
    fontSize: 8.5,
    textColor: C.TEXTO,
    lineColor: [230, 230, 230],
    lineWidth: 0.1,
  },
  alternateRowStyles: { fillColor: C.CINZA },
  footStyles: {
    fillColor: C.AZUL_ESC,
    textColor: C.BRANCO,
    fontStyle: 'bold',
    fontSize: 9,
  },
  margin: { left: MRG, right: MRG },
}

// ─── Novo doc A4 ─────────────────────────────────────────────────────────────
export function novoDoc() {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
}

// ─── Aplica rodapé em todas as páginas ───────────────────────────────────────
export function aplicarRodapes(doc) {
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    desenharRodape(doc, i, total)
  }
}
