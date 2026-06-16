import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { usePopup } from "../components/PopupProvider";
import SelectBusca from "../components/SelectBusca";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { salvarArquivo } from "../lib/salvarArquivo";
import {
  Search,
  TrendingUp,
  ShoppingCart,
  Package,
  DollarSign,
  Filter,
  FileDown,
  TableIcon,
} from "lucide-react";

const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "vendas", label: "Vendas" },
  { value: "entradas", label: "Entradas" },
  { value: "perdas", label: "Perdas" },
];

export default function Relatorios() {
  const popup = usePopup();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState(null);
  const [filtroAtivo, setFiltroAtivo] = useState("todos");
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    carregarClientes();
  }, []);

  async function carregarClientes() {
    const { data } = await supabase.from("clientes").select("*").order("nome");
    setClientes(data || []);
  }

  async function abrirHistorico(clienteId) {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) return;
    setClienteSelecionado(cliente);
    setLoadingHistorico(true);
    const { data: vendas } = await supabase
      .from("vendas")
      .select(
        "*, itens_venda(quantidade, valor_unitario, materiais(descricao))",
      )
      .eq("cliente_id", cliente.id)
      .order("data", { ascending: false });
    setHistorico(vendas || []);
    setLoadingHistorico(false);
  }

  async function gerarRelatorio() {
    if (!dataInicio || !dataFim) {
      popup.showWarning("Selecione o período!");
      return;
    }
    setLoading(true);
    const [{ data: vendas }, { data: entradas }, { data: perdas }] =
      await Promise.all([
        supabase
          .from("vendas")
          .select(
            "*, clientes(nome), itens_venda(quantidade, valor_unitario, materiais(descricao))",
          )
          .gte("data", dataInicio)
          .lte("data", dataFim)
          .order("data", { ascending: false }),
        supabase
          .from("entradas")
          .select("*, materiais(descricao), fornecedores(nome)")
          .gte("data", dataInicio)
          .lte("data", dataFim)
          .order("data", { ascending: false }),
        supabase
          .from("perdas")
          .select("*, materiais(descricao)")
          .gte("data", dataInicio)
          .lte("data", dataFim)
          .order("data", { ascending: false }),
      ]);

    const totalVendas = (vendas || []).reduce(
      (acc, v) => acc + (v.valor_total || 0),
      0,
    );
    const totalEntradas = (entradas || []).reduce(
      (acc, e) => acc + (e.custo || 0) * e.quantidade,
      0,
    );
    const totalPerdas = (perdas || []).reduce(
      (acc, p) => acc + (p.quantidade || 0),
      0,
    );

    const vendasPorCliente = (vendas || []).reduce((acc, v) => {
      const nome = v.clientes?.nome || "Sem cliente";
      if (!acc[nome]) acc[nome] = { total: 0, quantidade: 0 };
      acc[nome].total += v.valor_total || 0;
      acc[nome].quantidade += 1;
      return acc;
    }, {});

    const materiaisVendidos = {};
    (vendas || []).forEach((v) => {
      (v.itens_venda || []).forEach((item) => {
        const nome = item.materiais?.descricao || "Desconhecido";
        if (!materiaisVendidos[nome])
          materiaisVendidos[nome] = { quantidade: 0, valor: 0 };
        materiaisVendidos[nome].quantidade += item.quantidade || 0;
        materiaisVendidos[nome].valor +=
          (item.quantidade || 0) * (item.valor_unitario || 0);
      });
    });

    setRelatorio({
      vendas: vendas || [],
      entradas: entradas || [],
      perdas: perdas || [],
      totalVendas,
      totalEntradas,
      totalPerdas,
      vendasPorCliente,
      materiaisVendidos,
    });
    setFiltroAtivo("todos");
    setLoading(false);
  }

  async function exportarPDF() {
    if (!relatorio) return;
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const periodo = `${new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR")}`;
    const label =
      filtroAtivo === "todos"
        ? "Relatório Completo"
        : `Relatório de ${FILTROS.find((f) => f.value === filtroAtivo)?.label}`;
    const mostrarVendas = filtroAtivo === "todos" || filtroAtivo === "vendas";
    const mostrarEntradas =
      filtroAtivo === "todos" || filtroAtivo === "entradas";
    const mostrarPerdas = filtroAtivo === "todos" || filtroAtivo === "perdas";

    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, W, 28, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`Marmoraria JV — ${label}`, W / 2, 13, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 200);
    doc.text(`Período: ${periodo}`, W / 2, 21, { align: "center" });

    let y = 36;
    const cards = [];
    if (mostrarVendas) {
      cards.push({
        label: "Total em Vendas",
        valor: `R$ ${relatorio.totalVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        cor: [22, 163, 74],
      });
      cards.push({
        label: "Nº de Vendas",
        valor: String(relatorio.vendas.length),
        cor: [37, 99, 235],
      });
    }
    if (mostrarEntradas)
      cards.push({
        label: "Custo de Entradas",
        valor: `R$ ${relatorio.totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        cor: [202, 138, 4],
      });
    if (mostrarPerdas)
      cards.push({
        label: "Total de Perdas",
        valor: `${relatorio.totalPerdas.toFixed(2)} m²`,
        cor: [220, 38, 38],
      });

    if (cards.length > 0) {
      const cardW = (W - 28 - (cards.length - 1) * 4) / cards.length;
      cards.forEach((card, i) => {
        const cx = 14 + i * (cardW + 4);
        doc.setFillColor(...card.cor);
        doc.roundedRect(cx, y, cardW, 18, 2, 2, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(220, 220, 220);
        doc.text(card.label, cx + cardW / 2, y + 6, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(card.valor, cx + cardW / 2, y + 14, { align: "center" });
      });
      y += 26;
    }

    if (mostrarVendas && relatorio.vendas.length > 0) {
      doc.setFillColor(37, 99, 235);
      doc.rect(14, y, W - 28, 7, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("VENDAS DO PERÍODO", 17, y + 5);
      y += 9;
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [["Data", "Cliente", "Pagamento", "Valor"]],
        body: relatorio.vendas.map((v) => [
          new Date(v.data).toLocaleDateString("pt-BR"),
          v.clientes?.nome || "—",
          v.forma_pagamento || "—",
          `R$ ${(v.valor_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        ]),
        foot: [
          [
            "",
            "",
            "TOTAL:",
            `R$ ${relatorio.totalVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          ],
        ],
        styles: { fontSize: 8.5, textColor: [30, 30, 30] },
        headStyles: {
          fillColor: [220, 230, 242],
          textColor: [0, 60, 120],
          fontStyle: "bold",
          fontSize: 8.5,
        },
        alternateRowStyles: { fillColor: [248, 248, 252] },
        footStyles: {
          fillColor: [17, 24, 39],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: { 3: { halign: "right" } },
      });
      y = doc.lastAutoTable.finalY + 8;

      if (Object.keys(relatorio.vendasPorCliente).length > 0) {
        doc.setFillColor(220, 230, 242);
        doc.rect(14, y, W - 28, 7, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 60, 120);
        doc.text("VENDAS POR CLIENTE", 17, y + 5);
        y += 9;
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [["Cliente", "Nº Compras", "Total"]],
          body: Object.entries(relatorio.vendasPorCliente)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([nome, d]) => [
              nome,
              d.quantidade,
              `R$ ${d.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            ]),
          styles: { fontSize: 8.5 },
          headStyles: {
            fillColor: [220, 230, 242],
            textColor: [0, 60, 120],
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [248, 248, 252] },
          columnStyles: { 2: { halign: "right" } },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      if (Object.keys(relatorio.materiaisVendidos).length > 0) {
        doc.setFillColor(220, 230, 242);
        doc.rect(14, y, W - 28, 7, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 60, 120);
        doc.text("MATERIAIS MAIS VENDIDOS", 17, y + 5);
        y += 9;
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [["Material", "Qtd (m²)", "Total"]],
          body: Object.entries(relatorio.materiaisVendidos)
            .sort((a, b) => b[1].valor - a[1].valor)
            .map(([nome, d]) => [
              nome,
              d.quantidade.toFixed(2),
              `R$ ${d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            ]),
          styles: { fontSize: 8.5 },
          headStyles: {
            fillColor: [220, 230, 242],
            textColor: [0, 60, 120],
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [248, 248, 252] },
          columnStyles: { 2: { halign: "right" } },
        });
        y = doc.lastAutoTable.finalY + 8;
      }
    }

    if (mostrarEntradas && relatorio.entradas.length > 0) {
      doc.setFillColor(22, 163, 74);
      doc.rect(14, y, W - 28, 7, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("ENTRADAS DO PERÍODO", 17, y + 5);
      y += 9;
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [
          [
            "Data",
            "Material",
            "Fornecedor",
            "Qtd (m²)",
            "Custo Unit.",
            "Total",
          ],
        ],
        body: relatorio.entradas.map((e) => [
          new Date(e.data).toLocaleDateString("pt-BR"),
          e.materiais?.descricao || "—",
          e.fornecedores?.nome || "—",
          e.quantidade,
          `R$ ${(e.custo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          `R$ ${((e.custo || 0) * e.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        ]),
        foot: [
          [
            "",
            "",
            "",
            "",
            "TOTAL:",
            `R$ ${relatorio.totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          ],
        ],
        styles: { fontSize: 8.5 },
        headStyles: {
          fillColor: [187, 247, 208],
          textColor: [5, 80, 40],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        footStyles: {
          fillColor: [17, 24, 39],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: { 5: { halign: "right" } },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    if (mostrarPerdas && relatorio.perdas.length > 0) {
      doc.setFillColor(220, 38, 38);
      doc.rect(14, y, W - 28, 7, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("PERDAS DO PERÍODO", 17, y + 5);
      y += 9;
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [["Data", "Material", "Quantidade (m²)", "Motivo"]],
        body: relatorio.perdas.map((p) => [
          new Date(p.data).toLocaleDateString("pt-BR"),
          p.materiais?.descricao || "—",
          `${p.quantidade} m²`,
          p.motivo || "—",
        ]),
        foot: [["", "TOTAL:", `${relatorio.totalPerdas.toFixed(2)} m²`, ""]],
        styles: { fontSize: 8.5 },
        headStyles: {
          fillColor: [254, 202, 202],
          textColor: [120, 10, 10],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [255, 241, 242] },
        footStyles: {
          fillColor: [17, 24, 39],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
      });
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 287, W, 10, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 170);
      doc.text(
        `Marmoraria JV — Gerado em ${new Date().toLocaleString("pt-BR")} — Página ${i} de ${pageCount}`,
        W / 2,
        293,
        { align: "center" },
      );
    }
    await salvarArquivo(doc.output('arraybuffer'), `relatorio_${filtroAtivo}_${dataInicio}_${dataFim}.pdf`);
  }

  async function exportarExcel() {
    if (!relatorio) return;
    const wb = XLSX.utils.book_new();
    const mostrarVendas = filtroAtivo === "todos" || filtroAtivo === "vendas";
    const mostrarEntradas =
      filtroAtivo === "todos" || filtroAtivo === "entradas";
    const mostrarPerdas = filtroAtivo === "todos" || filtroAtivo === "perdas";

    if (mostrarVendas)
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          relatorio.vendas.map((v) => ({
            Data: new Date(v.data).toLocaleDateString("pt-BR"),
            Cliente: v.clientes?.nome || "—",
            Pagamento: v.forma_pagamento || "—",
            "Valor Total (R$)": v.valor_total || 0,
            Observação: v.observacao || "—",
          })),
        ),
        "Vendas",
      );
    if (mostrarEntradas)
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          relatorio.entradas.map((e) => ({
            Data: new Date(e.data).toLocaleDateString("pt-BR"),
            Material: e.materiais?.descricao || "—",
            Fornecedor: e.fornecedores?.nome || "—",
            "Qtd (m²)": e.quantidade,
            "Custo Unit. (R$)": e.custo || 0,
            "Total (R$)": (e.custo || 0) * e.quantidade,
          })),
        ),
        "Entradas",
      );
    if (mostrarPerdas)
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          relatorio.perdas.map((p) => ({
            Data: new Date(p.data).toLocaleDateString("pt-BR"),
            Material: p.materiais?.descricao || "—",
            "Quantidade (m²)": p.quantidade,
            Motivo: p.motivo || "—",
          })),
        ),
        "Perdas",
      );

    await salvarArquivo(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), `relatorio_${filtroAtivo}_${dataInicio}_${dataFim}.xlsx`);
  }

  const mostrarVendas = filtroAtivo === "todos" || filtroAtivo === "vendas";
  const mostrarEntradas = filtroAtivo === "todos" || filtroAtivo === "entradas";
  const mostrarPerdas = filtroAtivo === "todos" || filtroAtivo === "perdas";

  return (
    <div className="space-y-5">
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-700">
          <h3 className="text-gray-100 font-semibold mb-4 flex items-center gap-2">
            <Search size={18} className="text-blue-400" /> Selecione o Período
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col">
              <label className="text-sm text-gray-300 mb-1.5">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-44 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-300 mb-1.5">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-44 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={gerarRelatorio}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Search size={18} />
              {loading ? "Gerando..." : "Gerar Relatório"}
            </button>
          </div>
        </div>

        {relatorio && (
          <div className="px-5 py-3 border-b border-gray-700 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={15} className="text-gray-400" />
              {FILTROS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFiltroAtivo(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtroAtivo === f.value ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportarPDF}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
              >
                <FileDown size={15} /> PDF
              </button>
              <button
                onClick={exportarExcel}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
              >
                <TableIcon size={15} /> Excel
              </button>
            </div>
          </div>
        )}

        {relatorio && (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total em Vendas",
                  valor: `R$ ${relatorio.totalVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  icon: DollarSign,
                  cor: "bg-green-600",
                },
                {
                  label: "Nº de Vendas",
                  valor: relatorio.vendas.length,
                  icon: ShoppingCart,
                  cor: "bg-blue-600",
                },
                {
                  label: "Custo de Entradas",
                  valor: `R$ ${relatorio.totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  icon: Package,
                  cor: "bg-yellow-600",
                },
                {
                  label: "Perdas (m²)",
                  valor: `${relatorio.totalPerdas.toFixed(2)} m²`,
                  icon: TrendingUp,
                  cor: "bg-red-600",
                },
              ].map(({ label, valor, icon: Icon, cor }) => (
                <div
                  key={label}
                  className="bg-gray-700 rounded-xl p-4 flex items-center gap-4 border border-gray-600"
                >
                  <div className={`${cor} p-3 rounded-lg shrink-0`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">{label}</p>
                    <p className="text-white font-bold text-lg">{valor}</p>
                  </div>
                </div>
              ))}
            </div>

            {mostrarVendas && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-xl p-4 border border-gray-600">
                  <h3 className="text-sm uppercase tracking-wide text-blue-400 font-semibold mb-3">
                    Vendas por Cliente
                  </h3>
                  {Object.keys(relatorio.vendasPorCliente).length === 0 ? (
                    <p className="text-gray-400 text-sm">
                      Nenhuma venda no período.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-2 text-gray-300">
                            Cliente
                          </th>
                          <th className="text-left py-2 text-gray-300">
                            Compras
                          </th>
                          <th className="text-right py-2 text-gray-300">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(relatorio.vendasPorCliente)
                          .sort((a, b) => b[1].total - a[1].total)
                          .map(([nome, dados]) => (
                            <tr key={nome} className="border-b border-gray-600">
                              <td className="py-2 text-gray-200">{nome}</td>
                              <td className="py-2 text-gray-400">
                                {dados.quantidade}
                              </td>
                              <td className="py-2 text-green-400 font-medium text-right">
                                R${" "}
                                {dados.total.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="bg-gray-700 rounded-xl p-4 border border-gray-600">
                  <h3 className="text-sm uppercase tracking-wide text-blue-400 font-semibold mb-3">
                    Materiais Mais Vendidos
                  </h3>
                  {Object.keys(relatorio.materiaisVendidos).length === 0 ? (
                    <p className="text-gray-400 text-sm">
                      Nenhum material vendido no período.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-2 text-gray-300">
                            Material
                          </th>
                          <th className="text-left py-2 text-gray-300">
                            Qtd (m²)
                          </th>
                          <th className="text-right py-2 text-gray-300">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(relatorio.materiaisVendidos)
                          .sort((a, b) => b[1].valor - a[1].valor)
                          .map(([nome, dados]) => (
                            <tr key={nome} className="border-b border-gray-600">
                              <td className="py-2 text-gray-200">{nome}</td>
                              <td className="py-2 text-blue-400">
                                {dados.quantidade.toFixed(2)}
                              </td>
                              <td className="py-2 text-green-400 font-medium text-right">
                                R${" "}
                                {dados.valor.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {mostrarVendas && (
              <div className="bg-gray-700 rounded-xl p-4 border border-gray-600">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-400 mb-3">
                  Todas as Vendas do Período
                </h3>
                {relatorio.vendas.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    Nenhuma venda no período.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-2 text-gray-300">Data</th>
                          <th className="text-left py-2 text-gray-300">
                            Cliente
                          </th>
                          <th className="text-left py-2 text-gray-300">
                            Pagamento
                          </th>
                          <th className="text-right py-2 text-gray-300">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.vendas.map((v) => (
                          <tr
                            key={v.id}
                            className="border-b border-gray-600 hover:bg-gray-600"
                          >
                            <td className="py-2 text-gray-400">
                              {new Date(v.data).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-2 text-gray-200">
                              {v.clientes?.nome || "—"}
                            </td>
                            <td className="py-2 text-gray-400">
                              {v.forma_pagamento || "—"}
                            </td>
                            <td className="py-2 text-green-400 font-bold text-right">
                              R${" "}
                              {(v.valor_total || 0).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {mostrarEntradas && (
              <div className="bg-gray-700 rounded-xl p-4 border border-gray-600">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-yellow-400 mb-3 flex items-center gap-2">
                  <Package size={14} /> Entradas do Período
                </h3>
                {relatorio.entradas.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    Nenhuma entrada no período.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-2 text-gray-300">Data</th>
                          <th className="text-left py-2 text-gray-300">
                            Material
                          </th>
                          <th className="text-left py-2 text-gray-300">
                            Fornecedor
                          </th>
                          <th className="text-left py-2 text-gray-300">
                            Qtd (m²)
                          </th>
                          <th className="text-left py-2 text-gray-300">
                            Custo Unit.
                          </th>
                          <th className="text-right py-2 text-gray-300">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.entradas.map((e) => (
                          <tr
                            key={e.id}
                            className="border-b border-gray-600 hover:bg-gray-600"
                          >
                            <td className="py-2 text-gray-400">
                              {new Date(e.data).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-2 text-gray-200">
                              {e.materiais?.descricao || "—"}
                            </td>
                            <td className="py-2 text-gray-400">
                              {e.fornecedores?.nome || "—"}
                            </td>
                            <td className="py-2 text-blue-400">
                              {e.quantidade}
                            </td>
                            <td className="py-2 text-gray-400">
                              R${" "}
                              {(e.custo || 0).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-2 text-yellow-400 font-medium text-right">
                              R${" "}
                              {((e.custo || 0) * e.quantidade).toLocaleString(
                                "pt-BR",
                                { minimumFractionDigits: 2 },
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {mostrarPerdas && (
              <div className="bg-gray-700 rounded-xl p-4 border border-gray-600">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-red-400 mb-3 flex items-center gap-2">
                  <TrendingUp size={14} /> Perdas do Período
                </h3>
                {relatorio.perdas.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    Nenhuma perda no período.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-2 text-gray-300">Data</th>
                          <th className="text-left py-2 text-gray-300">
                            Material
                          </th>
                          <th className="text-left py-2 text-gray-300">
                            Quantidade (m²)
                          </th>
                          <th className="text-left py-2 text-gray-300">
                            Motivo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.perdas.map((p) => (
                          <tr
                            key={p.id}
                            className="border-b border-gray-600 hover:bg-gray-600"
                          >
                            <td className="py-2 text-gray-400">
                              {new Date(p.data).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-2 text-gray-200">
                              {p.materiais?.descricao || "—"}
                            </td>
                            <td className="py-2 text-red-400 font-bold">
                              {p.quantidade} m²
                            </td>
                            <td className="py-2 text-gray-400">
                              {p.motivo || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Histórico de Vendas por Cliente */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-700">
          <h3 className="text-gray-100 font-semibold flex items-center gap-2">
            <ShoppingCart size={18} className="text-purple-400" />
            Histórico de Vendas por Cliente
          </h3>
        </div>
        <div className="p-5">
          <label className="text-sm text-gray-300 mb-2 block">
            Selecione um Cliente
          </label>
          <SelectBusca
            opcoes={clientes}
            valor={clienteSelecionado?.id || ""}
            onChange={abrirHistorico}
            placeholder="Selecione um cliente..."
            campoLabel="nome"
            manterAberto={true}
          />

          {loadingHistorico && (
            <p className="text-gray-400 text-sm py-6 text-center">
              Carregando...
            </p>
          )}

          {clienteSelecionado && !loadingHistorico && (
            <div className="mt-4">
              <div className="bg-gray-700 rounded-xl p-4 mb-4 flex justify-between items-center border border-gray-600">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide">
                    Total de compras
                  </p>
                  <p className="text-white font-bold text-2xl">
                    {historico.length}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs uppercase tracking-wide">
                    Valor total gasto
                  </p>
                  <p className="text-green-400 font-bold text-2xl">
                    R${" "}
                    {historico
                      .reduce((acc, v) => acc + (v.valor_total || 0), 0)
                      .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {historico.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">
                  Nenhuma compra registrada.
                </p>
              ) : (
                <div className="space-y-3">
                  {historico.map((v) => (
                    <div
                      key={v.id}
                      className="bg-gray-700 rounded-xl p-4 border border-gray-600"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-gray-100 font-medium">
                            {v.tipo_trabalho || "Sem tipo"}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {new Date(v.data).toLocaleDateString("pt-BR")} •{" "}
                            {v.forma_pagamento || "—"}
                          </p>
                        </div>
                        <p className="text-green-400 font-bold">
                          R${" "}
                          {(v.valor_total || 0).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      {v.itens_venda && v.itens_venda.length > 0 && (
                        <div className="border-t border-gray-600 pt-2 mt-2">
                          <p className="text-gray-400 text-xs mb-1">
                            Materiais:
                          </p>
                          {v.itens_venda.map((item) => (
                            <p key={item.material_id} className="text-gray-300 text-sm">
                              • {item.materiais?.descricao} — {item.quantidade}{" "}
                              m² × R${" "}
                              {(item.valor_unitario || 0).toLocaleString(
                                "pt-BR",
                                { minimumFractionDigits: 2 },
                              )}
                            </p>
                          ))}
                        </div>
                      )}
                      {v.observacao && (
                        <p className="text-gray-500 text-xs mt-2">
                          Obs: {v.observacao}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
