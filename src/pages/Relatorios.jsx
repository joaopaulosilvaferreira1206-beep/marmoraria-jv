import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { exportarVendasPDF, exportarVendasExcel } from "../lib/exportar";
import { usePopup } from "../components/PopupProvider";
import SelectBusca from "../components/SelectBusca";
import {
  Search,
  TrendingUp,
  ShoppingCart,
  Package,
  DollarSign,
  X,
} from "lucide-react";

export default function Relatorios() {
  const popup = usePopup();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState(null);

  // Estados para histórico de vendas por cliente
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [modalHistorico, setModalHistorico] = useState(false);

  useEffect(() => {
    carregarClientes();
  }, []);

  async function carregarClientes() {
    const { data } = await supabase.from("clientes").select("*").order("nome");
    setClientes(data || []);
  }

  async function abrirHistorico(cliente) {
    setClienteSelecionado(cliente);
    setModalHistorico(true);
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

    const { data: vendas } = await supabase
      .from("vendas")
      .select(
        "*, clientes(nome), itens_venda(quantidade, valor_unitario, materiais(descricao))",
      )
      .gte("data", dataInicio)
      .lte("data", dataFim)
      .order("data", { ascending: false });

    const { data: entradas } = await supabase
      .from("entradas")
      .select("*, materiais(descricao)")
      .gte("data", dataInicio)
      .lte("data", dataFim);

    const { data: perdas } = await supabase
      .from("perdas")
      .select("*, materiais(descricao)")
      .gte("data", dataInicio)
      .lte("data", dataFim);

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
      totalVendas,
      totalEntradas,
      totalPerdas,
      vendasPorCliente,
      materiaisVendidos,
    });

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h3 className="text-gray-100 font-semibold mb-4">
          Selecione o Período
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <div className="flex flex-col">
              <label className="text-sm text-gray-300 mb-1.5">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-44 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-300 mb-1.5">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-44 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 -mb-3"
              />
            </div>
            <button
              onClick={gerarRelatorio}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 mt-7"
            >
              <Search size={18} />
              {loading ? "Gerando..." : "Gerar Relatório"}
            </button>
          </div>

          {relatorio && (
            <div className="flex gap-3">
              <button
                onClick={() =>
                  exportarVendasPDF(
                    relatorio.vendas,
                    `Período: ${dataInicio} a ${dataFim}`,
                  )
                }
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
              >
                Exportar PDF
              </button>
              <button
                onClick={() => exportarVendasExcel(relatorio.vendas)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
              >
                Exportar Excel
              </button>
            </div>
          )}
        </div>

        {relatorio && (
          <>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex items-center gap-4">
                <div className="bg-green-600 p-3 rounded-lg">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total em Vendas</p>
                  <p className="text-white font-bold text-lg">
                    R${" "}
                    {relatorio.totalVendas.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-lg">
                  <ShoppingCart size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Nº de Vendas</p>
                  <p className="text-white font-bold text-lg">
                    {relatorio.vendas.length}
                  </p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex items-center gap-4">
                <div className="bg-yellow-600 p-3 rounded-lg">
                  <Package size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Custo de Entradas</p>
                  <p className="text-white font-bold text-lg">
                    R${" "}
                    {relatorio.totalEntradas.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex items-center gap-4">
                <div className="bg-red-600 p-3 rounded-lg">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Perdas (m²)</p>
                  <p className="text-white font-bold text-lg">
                    {relatorio.totalPerdas.toFixed(2)} m²
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vendas por cliente */}
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-gray-100 font-semibold mb-4">
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
                        <th className="text-left py-2 text-gray-300">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(relatorio.vendasPorCliente)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([nome, dados]) => (
                          <tr key={nome} className="border-b border-gray-700">
                            <td className="py-2 text-gray-200">{nome}</td>
                            <td className="py-2 text-gray-400">
                              {dados.quantidade}
                            </td>
                            <td className="py-2 text-green-400 font-medium">
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

              {/* Materiais mais vendidos */}
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-gray-100 font-semibold mb-4">
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
                        <th className="text-left py-2 text-gray-300">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(relatorio.materiaisVendidos)
                        .sort((a, b) => b[1].valor - a[1].valor)
                        .map(([nome, dados]) => (
                          <tr key={nome} className="border-b border-gray-700">
                            <td className="py-2 text-gray-200">{nome}</td>
                            <td className="py-2 text-blue-400">
                              {dados.quantidade.toFixed(2)}
                            </td>
                            <td className="py-2 text-green-400 font-medium">
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

            {/* Lista de vendas */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <h3 className="text-gray-100 font-semibold mb-4">
                Todas as Vendas do Período
              </h3>
              {relatorio.vendas.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  Nenhuma venda no período.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left py-2 text-gray-300">Data</th>
                      <th className="text-left py-2 text-gray-300">Cliente</th>
                      <th className="text-left py-2 text-gray-300">Tipo</th>
                      <th className="text-left py-2 text-gray-300">
                        Pagamento
                      </th>
                      <th className="text-left py-2 text-gray-300">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.vendas.map((v) => (
                      <tr
                        key={v.id}
                        className="border-b border-gray-700 hover:bg-gray-700"
                      >
                        <td className="py-2 text-gray-400">
                          {new Date(v.data).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-2 text-gray-200">
                          {v.clientes?.nome || "—"}
                        </td>
                        <td className="py-2 text-gray-400">
                          {v.tipo_trabalho || "—"}
                        </td>
                        <td className="py-2 text-gray-400">
                          {v.forma_pagamento || "—"}
                        </td>
                        <td className="py-2 text-green-400 font-bold">
                          R${" "}
                          {(v.valor_total || 0).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Histórico de Vendas por Cliente */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h3 className="text-gray-100 font-semibold mb-4">
          Histórico de Vendas por Cliente
        </h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-300 mb-2 block">
              Selecione um Cliente
            </label>
            <SelectBusca
              opcoes={clientes}
              valor={clienteSelecionado?.id || ""}
              onChange={(clienteId) => {
                const cliente = clientes.find((c) => c.id === clienteId);
                if (cliente) {
                  abrirHistorico(cliente);
                }
              }}
              placeholder="Selecione um cliente..."
              campoLabel="nome"
            />
          </div>
        </div>
      </div>

      {/* Modal Histórico */}
      {modalHistorico && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-3xl max-h-screen overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">
                  Histórico de Compras
                </h3>
                <p className="text-sm text-gray-400">
                  {clienteSelecionado?.nome}
                </p>
              </div>
              <button
                onClick={() => setModalHistorico(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            {loadingHistorico ? (
              <p className="text-center text-gray-400 py-8">Carregando...</p>
            ) : historico.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                Nenhuma compra registrada.
              </p>
            ) : (
              <>
                <div className="bg-gray-700 rounded-lg p-4 mb-4 flex justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total de compras</p>
                    <p className="text-white font-bold text-xl">
                      {historico.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Valor total gasto</p>
                    <p className="text-green-400 font-bold text-xl">
                      R${" "}
                      {historico
                        .reduce((acc, v) => acc + (v.valor_total || 0), 0)
                        .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {historico.map((v) => (
                    <div
                      key={v.id}
                      className="bg-gray-700 rounded-lg p-4 border border-gray-600"
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
                          {v.itens_venda.map((item, i) => (
                            <p key={i} className="text-gray-300 text-sm">
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
