import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// ===== PDF =====

export function exportarVendasPDF(vendas, periodo = '') {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('Marmoraria JV — Relatório de Vendas', 14, 22)

    if (periodo) {
        doc.setFontSize(11)
        doc.text(periodo, 14, 30)
    }

    const total = vendas.reduce((acc, v) => acc + (v.valor_total || 0), 0)

    autoTable(doc, {
        startY: periodo ? 36 : 30,
        head: [['Data', 'Cliente', 'Tipo', 'Pagamento', 'Valor']],
        body: vendas.map(v => [
            new Date(v.data).toLocaleDateString('pt-BR'),
            v.clientes?.nome || '—',
            v.tipo_trabalho || '—',
            v.forma_pagamento || '—',
            `R$ ${(v.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ]),
        foot: [['', '', '', 'Total:', `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [37, 99, 235] },
        footStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    })

    doc.save('vendas.pdf')
}

export function exportarEstoquePDF(materiais) {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('Marmoraria JV — Relatório de Estoque', 14, 22)

    doc.setFontSize(11)
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30)

    autoTable(doc, {
        startY: 36,
        head: [['SKU', 'Descrição', 'Saldo', 'Mín.', 'Máx.', 'Valor Médio', 'Valor Total', 'Unidade']],
        body: materiais.map(m => [
            m.sku,
            m.descricao,
            m.saldo ?? 0,
            m.minimo ?? '—',
            m.maximo ?? '—',
            `R$ ${(m.valor_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `R$ ${(m.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            m.unidade,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] },
    })

    doc.save('estoque.pdf')
}

export function exportarClientesPDF(clientes) {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('Marmoraria JV — Clientes', 14, 22)

    autoTable(doc, {
        startY: 30,
        head: [['Nome', 'Telefone', 'Email', 'Endereço']],
        body: clientes.map(c => [
            c.nome,
            c.telefone || '—',
            c.email || '—',
            c.endereco || '—',
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [37, 99, 235] },
    })

    doc.save('clientes.pdf')
}

// ===== EXCEL =====

export function exportarVendasExcel(vendas, periodo = '') {
    const dados = vendas.map(v => ({
        'Data': new Date(v.data).toLocaleDateString('pt-BR'),
        'Cliente': v.clientes?.nome || '—',
        'Tipo de Trabalho': v.tipo_trabalho || '—',
        'Forma de Pagamento': v.forma_pagamento || '—',
        'Valor Total (R$)': v.valor_total || 0,
        'Observação': v.observacao || '—',
    }))

    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas')
    XLSX.writeFile(wb, 'vendas.xlsx')
}

export function exportarEstoqueExcel(materiais) {
    const dados = materiais.map(m => ({
        'SKU': m.sku,
        'Descrição': m.descricao,
        'Saldo': m.saldo ?? 0,
        'Mínimo': m.minimo ?? 0,
        'Máximo': m.maximo ?? 0,
        'Valor Médio (R$)': m.valor_medio || 0,
        'Valor Total (R$)': m.valor_total || 0,
        'Unidade': m.unidade,
    }))

    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque')
    XLSX.writeFile(wb, 'estoque.xlsx')
}

export function exportarClientesExcel(clientes) {
    const dados = clientes.map(c => ({
        'Nome': c.nome,
        'Telefone': c.telefone || '—',
        'Email': c.email || '—',
        'Endereço': c.endereco || '—',
    }))

    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, 'clientes.xlsx')
}