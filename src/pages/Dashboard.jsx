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
  const [perdasPorMes, setPerdasPorMes] = useState([]);
  const [mesMeses, setMesMeses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
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
    const inicio5Meses = new Date(anoAtual, mesAtual - 4, 1).toISOString().split("T")[0];
    const inicioAno = new Date(anoAtual, 0, 1).toISOString().split("T")[0];

    const [
      { data: materiais },
      { data: perdas },
      { data: vendas },
      { data: vendasAno },
      { data: orcamentos },
      { data: perdasAno },
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
        .gte("data", inicio5Meses),
      supabase.from("orcamentos").select("id, status").eq("status", "pendente"),
      supabase
        .from("perdas")
        .select("data, quantidade")
        .gte("data", inicio5Meses),
    ]);

    if (materiais) {
      const estoqueBaixo = materiais.filter(
        (m) => m.minimo && m.saldo <= m.minimo,
      );
      const vendasMes = (vendasAno || [])
        .filter((v) => {
          const d = new Date(v.data + 'T00:00:00')
          return d.getFullYear() === anoAtual && d.getMonth() === mesAtual
        })
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

    // Agrupa vendas e perdas por mês (últimos 5 meses)
    {
      const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      const labels = [];
      const vendasGrp = {};
      const perdasGrp = {};
      for (let i = 4; i >= 0; i--) {
        const d = new Date(anoAtual, mesAtual - i, 1);
        const chave = `${d.getFullYear()}-${d.getMonth()}`;
        vendasGrp[chave] = 0;
        perdasGrp[chave] = 0;
        labels.push({ chave, mes: nomes[d.getMonth()] });
      }
      (vendasAno || []).forEach((v) => {
        const [ano, mes] = v.data.split('-').map(Number);
        const chave = `${ano}-${mes - 1}`;
        if (chave in vendasGrp) vendasGrp[chave] += v.valor_total || 0;
      });
      (perdasAno || []).forEach((p) => {
        const [ano, mes] = p.data.split('-').map(Number);
        const chave = `${ano}-${mes - 1}`;
        if (chave in perdasGrp) perdasGrp[chave] += p.quantidade || 0;
      });
      setMesMeses(labels);
      setVendasPorMes(labels.map(l => vendasGrp[l.chave]));
      setPerdasPorMes(labels.map(l => perdasGrp[l.chave]));
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

      {/* Gráfico vendas x perdas (últimos 3 meses) */}
      <div className="bg-gray-800 rounded-xl shadow p-5 border border-gray-700 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <DollarSign size={20} className="text-green-400" />
            Vendas × Perdas (últimos 5 meses)
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Ganho (R$)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Perda (m²)</span>
          </div>
        </div>
        {(() => {
          const BAR_H = 100;
          const maxV = Math.max(...vendasPorMes, 1);
          const maxP = Math.max(...perdasPorMes, 1);
          return (
            <div className="flex items-end gap-2 w-full" style={{ height: `${BAR_H + 32}px` }}>
              {mesMeses.map((l, i) => {
                const hV = Math.round(Math.max((vendasPorMes[i] / maxV) * BAR_H, vendasPorMes[i] > 0 ? 4 : 0));
                const hP = Math.round(Math.max((perdasPorMes[i] / maxP) * BAR_H, perdasPorMes[i] > 0 ? 4 : 0));
                return (
                  <div key={l.chave} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-1" style={{ height: `${BAR_H}px` }}>
                      <div className="flex-1 flex flex-col items-center justify-end">
                        {vendasPorMes[i] > 0 && (
                          <p className="text-xs text-green-400 text-center mb-0.5 leading-none">{`R$${(vendasPorMes[i]/1000).toFixed(1)}k`}</p>
                        )}
                        <div
                          className="w-full bg-green-500 hover:bg-green-400 rounded-t transition-all"
                          style={{ height: `${hV}px` }}
                        />
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-end">
                        {perdasPorMes[i] > 0 && (
                          <p className="text-xs text-red-400 text-center mb-0.5 leading-none">{`${perdasPorMes[i].toFixed(1)}m²`}</p>
                        )}
                        <div
                          className="w-full bg-red-500 hover:bg-red-400 rounded-t transition-all"
                          style={{ height: `${hP}px` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{l.mes}</p>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
