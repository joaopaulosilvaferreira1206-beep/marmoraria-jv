import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  ShoppingCart,
  FileText,
  DollarSign,
} from "lucide-react";

export default function Dashboard() {
  const [resumo, setResumo] = useState({
    totalMateriais: 0,
    valorEstoque: 0,
    estoqueBaixo: 0,
    perdasMes: 0,
    vendasMes: 0,
    orcamentosPendentes: 0,
  });
  const [alertas, setAlertas] = useState([]);
  const [vendasRecentes, setVendasRecentes] = useState([]);
  const [vendasPorMes, setVendasPorMes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
    const canal = supabase
      .channel("dashboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "materiais" },
        carregarDados,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas" },
        carregarDados,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "perdas" },
        carregarDados,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orcamentos" },
        carregarDados,
      )
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  async function carregarDados() {
    setLoading(true);

    const anoAtual = new Date().getFullYear();
    const mesAtual = new Date().getMonth();
    const inicioMes = new Date(anoAtual, mesAtual, 1)
      .toISOString()
      .split("T")[0];
    const inicioAno = new Date(anoAtual, 0, 1).toISOString().split("T")[0];

    const [
      { data: materiais },
      { data: perdas },
      { data: vendas },
      { data: vendasAno },
      { data: orcamentos },
    ] = await Promise.all([
      supabase.from("materiais").select("*"),
      supabase.from("perdas").select("quantidade").gte("data", inicioMes),
      supabase
        .from("vendas")
        .select("*, clientes(nome)")
        .order("criado_em", { ascending: false })
        .limit(5),
      supabase
        .from("vendas")
        .select("data, valor_total")
        .gte("data", inicioAno),
      supabase.from("orcamentos").select("id, status").eq("status", "pendente"),
    ]);

    if (materiais) {
      const estoqueBaixo = materiais.filter(
        (m) => m.minimo && m.saldo <= m.minimo,
      );
      const vendasMes = (vendasAno || [])
        .filter((v) => new Date(v.data).getMonth() === mesAtual)
        .reduce((acc, v) => acc + (v.valor_total || 0), 0);

      setResumo({
        totalMateriais: materiais.length,
        valorEstoque: materiais.reduce(
          (acc, m) => acc + (m.valor_total || 0),
          0,
        ),
        estoqueBaixo: estoqueBaixo.length,
        perdasMes:
          perdas?.reduce((acc, p) => acc + (p.quantidade || 0), 0) || 0,
        vendasMes,
        orcamentosPendentes: orcamentos?.length || 0,
      });
      setAlertas(estoqueBaixo.slice(0, 5));
    }

    // Agrupa vendas por mês (últimos 6 meses)
    if (vendasAno) {
      const meses = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];
      const agrupado = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(anoAtual, mesAtual - i, 1);
        const chave = `${d.getFullYear()}-${d.getMonth()}`;
        agrupado[chave] = { mes: meses[d.getMonth()], total: 0 };
      }
      vendasAno.forEach((v) => {
        const d = new Date(v.data);
        const chave = `${d.getFullYear()}-${d.getMonth()}`;
        if (agrupado[chave]) agrupado[chave].total += v.valor_total || 0;
      });
      setVendasPorMes(Object.values(agrupado));
    }

    if (vendas) setVendasRecentes(vendas);
    setLoading(false);
  }

  const cards = [
    {
      label: "Total de Materiais",
      valor: resumo.totalMateriais,
      icon: Package,
      cor: "bg-blue-500",
    },
    {
      label: "Valor em Estoque",
      valor: `R$ ${resumo.valorEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: ShoppingCart,
      cor: "bg-green-500",
    },
    {
      label: "Vendas no Mês",
      valor: `R$ ${resumo.vendasMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      cor: "bg-purple-500",
    },
    {
      label: "Orçamentos Pendentes",
      valor: resumo.orcamentosPendentes,
      icon: FileText,
      cor: "bg-orange-500",
    },
    {
      label: "Estoque Baixo",
      valor: resumo.estoqueBaixo,
      icon: AlertTriangle,
      cor: "bg-yellow-500",
    },
    {
      label: "Perdas no Mês (m²)",
      valor: resumo.perdasMes.toFixed(2),
      icon: TrendingDown,
      cor: "bg-red-500",
    },
  ];

  const maxVendas = Math.max(...vendasPorMes.map((m) => m.total), 1);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ label, valor, icon: Icon, cor }) => (
          <div
            key={label}
            className="bg-gray-800 rounded-xl shadow p-5 flex items-center gap-4 border border-gray-700"
          >
            <div className={`${cor} p-3 rounded-lg text-white shrink-0`}>
              <Icon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">{label}</p>
              <p className="text-xl font-bold text-white">{valor}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico de vendas por mês */}
      <div className="bg-gray-800 rounded-xl shadow p-5 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-5 flex items-center gap-2">
          <DollarSign size={20} className="text-purple-400" />
          Vendas por Mês (últimos 6 meses)
        </h3>
        <div className="flex items-end gap-3 h-40">
          {vendasPorMes.map((m) => (
            <div
              key={m.mes}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <p className="text-xs text-gray-400 font-medium">
                {m.total > 0 ? `R$ ${(m.total / 1000).toFixed(1)}k` : ""}
              </p>
              <div
                className="w-full relative flex items-end"
                style={{ height: "100px" }}
              >
                <div
                  className="w-full bg-purple-600 hover:bg-purple-500 rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max((m.total / maxVendas) * 100, m.total > 0 ? 4 : 0)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400">{m.mes}</p>
            </div>
          ))}
        </div>
        {vendasPorMes.every((m) => m.total === 0) && (
          <p className="text-gray-500 text-sm text-center mt-2">
            Nenhuma venda registrada nos últimos 6 meses.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de estoque */}
        <div className="bg-gray-800 rounded-xl shadow p-5 border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-yellow-500" />
            Alertas de Estoque Baixo
          </h3>
          {alertas.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum alerta no momento ✅</p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-300">
                      Material
                    </th>
                    <th className="text-left px-4 py-2 text-gray-300">Saldo</th>
                    <th className="text-left px-4 py-2 text-gray-300">
                      Mínimo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((m) => (
                    <tr key={m.id} className="border-t border-gray-700">
                      <td className="px-4 py-2 font-medium text-gray-100">
                        {m.descricao}
                      </td>
                      <td className="px-4 py-2 text-red-400 font-bold">
                        {m.saldo} m²
                      </td>
                      <td className="px-4 py-2 text-gray-400">{m.minimo} m²</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vendas recentes */}
        <div className="bg-gray-800 rounded-xl shadow p-5 border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <ShoppingCart size={20} className="text-blue-500" />
            Vendas Recentes
          </h3>
          {vendasRecentes.length === 0 ? (
            <p className="text-gray-400 text-sm">
              Nenhuma venda registrada ainda.
            </p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-300">
                      Cliente
                    </th>
                    <th className="text-left px-4 py-2 text-gray-300">Data</th>
                    <th className="text-left px-4 py-2 text-gray-300">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasRecentes.map((v) => (
                    <tr key={v.id} className="border-t border-gray-700">
                      <td className="px-4 py-2 font-medium text-gray-100">
                        {v.clientes?.nome || "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-400">
                        {new Date(v.data).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-2 text-green-400 font-bold">
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
      </div>
    </div>
  );
}
