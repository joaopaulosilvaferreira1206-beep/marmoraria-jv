import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoJV from "../assets/logo-jv.png";

async function carregarImagemBase64(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarPDFOrcamento(orcamento, itens, cliente) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 14;
  const IMG_SIZE = 16;

  // Pré-carrega imagens dos materiais
  const imagensItens = await Promise.all(
    itens.map((i) =>
      i.imagem_url ? carregarImagemBase64(i.imagem_url) : Promise.resolve(null),
    ),
  );

  // ── CABEÇALHO ──────────────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, 38, "F");

  doc.addImage(logoJV, "PNG", margin, 4, 50, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 102, 179);
  doc.text("MARCENARIA & MARMORARIA J.V.", W - margin, 10, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text(
    "Especializada na confecção de móveis e esquadrias em madeira e MDF simples e trabalhadas;",
    W - margin,
    15,
    { align: "right" },
  );
  doc.text("temos ainda, mármores e granitos em geral.", W - margin, 19, {
    align: "right",
  });
  doc.setFont("helvetica", "bold");
  doc.text(
    "Rodovia Santos Dumont (em frente ao Aeroporto) - BRAGANÇA - PARÁ",
    W - margin,
    24,
    { align: "right" },
  );
  doc.text("Fone: (91) 3425-2208", W - margin, 28, { align: "right" });

  doc.setFillColor(0, 102, 179);
  doc.rect(0, 36, W, 1.2, "F");
  doc.setFillColor(0, 153, 51);
  doc.rect(0, 37.2, W, 1.2, "F");

  // ── TÍTULO ─────────────────────────────────────────────────
  const numOrc = orcamento.id?.slice(0, 8).toUpperCase() || "--------";
  doc.setFillColor(220, 230, 242);
  doc.rect(margin, 41, W - margin * 2, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 60, 120);
  doc.text(`ORÇAMENTO Nº: ${numOrc}`, W / 2, 46.2, { align: "center" });

  // ── INFO ───────────────────────────────────────────────────
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, 50, W - margin * 2, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);

  const dataOrc = orcamento.data
    ? new Date(orcamento.data + "T12:00:00").toLocaleDateString("pt-BR")
    : "—";
  const validade = orcamento.validade
    ? new Date(orcamento.validade + "T12:00:00").toLocaleDateString("pt-BR")
    : "—";

  doc.text(`Data: ${dataOrc}`, margin + 2, 55);
  doc.text(`Validade: ${validade}`, W / 2, 55, { align: "center" });
  doc.text(
    `Pagamento: ${orcamento.forma_pagamento || "—"}`,
    W - margin - 2,
    55,
    { align: "right" },
  );

  // ── DADOS DO CLIENTE ───────────────────────────────────────
  let y = 61;
  doc.setFillColor(0, 102, 179);
  doc.rect(margin, y, W - margin * 2, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("1 DADOS DO CLIENTE", margin + 2, y + 4.2);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`Cliente: ${cliente?.nome || "—"}`, margin + 2, y);
  y += 5;
  doc.text(`Telefone: ${cliente?.telefone || "—"}`, margin + 2, y);
  doc.text(`E-mail: ${cliente?.email || "—"}`, margin + 80, y);
  y += 5;
  doc.text(`Endereço: ${cliente?.endereco || "—"}`, margin + 2, y);

  // ── PRODUTOS / SERVIÇOS ────────────────────────────────────
  y += 9;
  doc.setFillColor(0, 102, 179);
  doc.rect(margin, y, W - margin * 2, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("2 PRODUTOS / SERVIÇOS", margin + 2, y + 4.2);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        "Foto",
        "Descrição",
        "Tipo de Trabalho",
        "Qtd (m²)",
        "Valor Unit. (R$)",
        "Subtotal (R$)",
      ],
    ],
    body: itens.map((item) => [
      "",
      item.descricao,
      item.tipo_trabalho || "—",
      Number(item.quantidade).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      }),
      Number(item.valor_unitario).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      }),
      (Number(item.quantidade) * Number(item.valor_unitario)).toLocaleString(
        "pt-BR",
        { minimumFractionDigits: 2 },
      ),
    ]),
    headStyles: {
      fillColor: [220, 230, 242],
      textColor: [0, 60, 120],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 30, 30],
      minCellHeight: IMG_SIZE + 6,
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 32 },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 26, halign: "right" },
      5: { cellWidth: 26, halign: "right" },
    },
    didDrawCell(data) {
      if (data.section === "body" && data.column.index === 0) {
        const img = imagensItens[data.row.index];
        const cellX = data.cell.x + 2;
        const cellY = data.cell.y + 2;
        const size = IMG_SIZE - 2;
        if (img) {
          doc.addImage(img, "JPEG", cellX, cellY, size, size);
        } else {
          doc.setFillColor(200, 200, 200);
          doc.rect(cellX, cellY, size, size, "F");
          doc.setFontSize(6);
          doc.setTextColor(120, 120, 120);
          doc.text("Sem foto", cellX + size / 2, cellY + size / 2, {
            align: "center",
          });
        }
      }
    },
  });

  // ── TOTALIZADORES ──────────────────────────────────────────
  y = doc.lastAutoTable.finalY + 6;
  const totalItens = itens.length;
  const totalM2 = itens.reduce((acc, i) => acc + Number(i.quantidade), 0);
  const total = itens.reduce(
    (acc, i) => acc + Number(i.quantidade) * Number(i.valor_unitario),
    0,
  );

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, W - margin * 2, 18, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(`Soma de Itens: ${totalItens}`, margin + 2, y + 6);
  doc.text(`Soma das Qtdes: ${totalM2.toFixed(2)} m²`, margin + 2, y + 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 60, 120);
  doc.text("TOTAL GERAL:", W - margin - 58, y + 10);
  doc.text(
    `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    W - margin - 2,
    y + 10,
    { align: "right" },
  );

  y += 24; // avança y para depois do bloco de totalizadores

  // ── FORMA DE PAGAMENTO ─────────────────────────────────────
  if (orcamento.forma_pagamento) {
    y += 4;
    doc.setFillColor(0, 102, 179);
    doc.rect(margin, y, W - margin * 2, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("3 FORMA DE PAGAMENTO", margin + 2, y + 4.2);
    y += 11;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(orcamento.forma_pagamento, margin + 2, y);
    y += 6;
  }

  // ── OBSERVAÇÕES ────────────────────────────────────────────
  if (orcamento.observacao) {
    y += 4;
    doc.setFillColor(0, 102, 179);
    doc.rect(margin, y, W - margin * 2, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("4 OBSERVAÇÕES", margin + 2, y + 4.2);
    y += 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    const linhas = doc.splitTextToSize(
      orcamento.observacao,
      W - margin * 2 - 4,
    );
    doc.text(linhas, margin + 2, y);
    y += linhas.length * 5 + 4;
  }

  // ── DECLARAÇÃO ─────────────────────────────────────────────
  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const declaracao =
    "Declaro ter conferido a quantidade e as condições dos produtos/serviços entregues, dando plena quitação do feito, para mais nada reclamar.";
  doc.text(doc.splitTextToSize(declaracao, W - margin * 2), margin, y);

  // ── ASSINATURA ─────────────────────────────────────────────
  y = Math.max(y + 16, 245);
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + 75, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Assinatura do Cliente", margin, y + 4);
  doc.text(cliente?.nome || "", margin, y + 8);

  doc.line(W - margin - 75, y, W - margin, y);
  doc.text("Assinatura / Carimbo da Empresa", W - margin - 75, y + 4);
  doc.text("Marcenaria & Marmoraria J.V.", W - margin - 75, y + 8);

  // ── RODAPÉ ─────────────────────────────────────────────────
  doc.setFillColor(0, 102, 179);
  doc.rect(0, 285, W, 12, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    "Marcenaria & Marmoraria J.V. — Fone: (91) 3425-2208 — Rodovia Santos Dumont, em frente ao Aeroporto, Bragança - PA",
    W / 2,
    290,
    { align: "center" },
  );
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    W / 2,
    294,
    { align: "center" },
  );

  doc.save(
    `Orcamento_${numOrc}_${(cliente?.nome || "cliente").replace(/\s+/g, "_")}.pdf`,
  );
}
