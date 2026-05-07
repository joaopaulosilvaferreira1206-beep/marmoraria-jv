import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Plus,
  X,
  Trash2,
  CheckCircle,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { usePopup } from "../components/PopupProvider";
import SelectBusca from "../components/SelectBusca";
import SelectOuDigita from "../components/SelectOuDigita";
import { BotaoVisualizar } from "../components/Visualizador3D";
import { gerarPDFOrcamento } from "../lib/pdfOrcamento";

const orcamentoVazio = {
  cliente_id: "",
  data: new Date().toISOString().split("T")[0],
  validade: "",
  forma_pagamento: "",
  observacao: "",
};

const itemFormVazio = {
  material_id: "",
  largura: "",
  comprimento: "",
  quantidade: "",
  valor_unitario: "",
  desconto: "",
  tipo_trabalho: "",
};

const statusCores = {
  pendente: "bg-yellow-900/30 text-yellow-400",
  aprovado: "bg-green-900/30 text-green-400",
  recusado: "bg-red-900/30 text-red-400",
  convertido: "bg-blue-900/30 text-blue-400",
};

function FormCabecalho({ form, setForm, clientes, onNovoCliente }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      <div className="sm:col-span-1">
        <label className="text-sm text-gray-400">Cliente *</label>
        <div className="mt-1 flex gap-2">
          <div className="flex-1 min-w-0">
            <SelectBusca
              opcoes={clientes}
              valor={form.cliente_id}
              onChange={(v) => setForm((f) => ({ ...f, cliente_id: v }))}
              placeholder="Selecione o cliente..."
            />
          </div>
          <button
            type="button"
            onClick={onNovoCliente}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg border border-gray-600 text-sm transition-colors shrink-0"
          >
            + Novo
          </button>
        </div>
      </div>
      <div>
        <label className="text-sm text-gray-400">Data</label>
        <input
          type="date"
          value={form.data}
          onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
          className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="text-sm text-gray-400">Validade</label>
        <input
          type="date"
          value={form.validade}
          onChange={(e) => setForm((f) => ({ ...f, validade: e.target.value }))}
          className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="text-sm text-gray-400">Forma de Pagamento</label>
        <div className="mt-1">
          <SelectOuDigita
            opcoes={[
              "Dinheiro",
              "PIX",
              "Cartão de Crédito",
              "Cartão de Débito",
              "Boleto",
              "A prazo",
            ]}
            value={form.forma_pagamento}
            onChange={(v) => setForm((f) => ({ ...f, forma_pagamento: v }))}
            placeholder="Selecione ou digite..."
          />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm text-gray-400">Observação</label>
        <textarea
          value={form.observacao}
          onChange={(e) =>
            setForm((f) => ({ ...f, observacao: e.target.value }))
          }
          rows={2}
          className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}

function FormItens({
  materiais,
  itens,
  itemForm,
  setItemForm,
  onAdicionar,
  onRemover,
}) {
  const totalOrcamento = itens.reduce(
    (acc, i) => acc + i.quantidade * i.valor_unitario,
    0,
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="col-span-2">
          <SelectBusca
            opcoes={materiais}
            valor={itemForm.material_id}
            onChange={(v) => {
              const mat = materiais.find((m) => m.id === v);
              setItemForm((f) => ({
                ...f,
                material_id: v,
                valor_unitario: mat?.valor_medio || "",
                desconto: 0,
              }));
            }}
            placeholder="Buscar por nome ou SKU..."
            campoLabel="descricao"
            campoSecundario="sku"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-400">
            Tipo de Trabalho deste item
          </label>
          <div className="mt-1">
            <SelectOuDigita
              value={itemForm.tipo_trabalho}
              onChange={(v) => setItemForm((f) => ({ ...f, tipo_trabalho: v }))}
              placeholder="Ex: Corte, Polimento, Instalação..."
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400">Largura (m)</label>
          <input
            type="number"
            placeholder="0.00"
            value={itemForm.largura}
            onChange={(e) => {
              const largura = e.target.value;
              const area = (
                Number(largura) * Number(itemForm.comprimento)
              ).toFixed(2);
              setItemForm((f) => ({
                ...f,
                largura,
                quantidade: Number(area) > 0 ? area : "",
              }));
            }}
            className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Comprimento (m)</label>
          <input
            type="number"
            placeholder="0.00"
            value={itemForm.comprimento}
            onChange={(e) => {
              const comprimento = e.target.value;
              const area = (
                Number(itemForm.largura) * Number(comprimento)
              ).toFixed(2);
              setItemForm((f) => ({
                ...f,
                comprimento,
                quantidade: Number(area) > 0 ? area : "",
              }));
            }}
            className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Área calculada (m²)</label>
          <input
            type="number"
            readOnly
            value={itemForm.quantidade}
            className="w-full bg-gray-700 border border-gray-600 text-blue-400 rounded-lg px-3 py-2 mt-1 opacity-75 cursor-not-allowed font-bold"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Desconto (%)</label>
          <input
            type="number"
            placeholder="0"
            value={itemForm.desconto || ""}
            onChange={(e) => {
              const desconto = Number(e.target.value);
              const mat = materiais.find((m) => m.id === itemForm.material_id);
              const preco = mat?.valor_medio || 0;
              setItemForm((f) => ({
                ...f,
                desconto: e.target.value,
                valor_unitario: (preco * (1 - desconto / 100)).toFixed(2),
              }));
            }}
            className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Custo unit. (R$)</label>
          <input
            type="number"
            readOnly
            value={
              materiais.find((m) => m.id === itemForm.material_id)
                ?.valor_medio || ""
            }
            className="w-full bg-gray-700 border border-gray-600 text-gray-400 rounded-lg px-3 py-2 mt-1 opacity-50 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Preço de venda (R$)</label>
          <input
            type="number"
            placeholder="0.00"
            value={itemForm.valor_unitario}
            onChange={(e) =>
              setItemForm((f) => ({ ...f, valor_unitario: e.target.value }))
            }
            className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {itemForm.material_id &&
        itemForm.quantidade &&
        itemForm.valor_unitario && (
          <div className="bg-gray-700 rounded-lg px-3 py-2 mb-2 text-sm flex justify-between">
            <span className="text-gray-300">Subtotal:</span>
            <span className="text-green-400 font-bold">
              R${" "}
              {(
                Number(itemForm.quantidade) * Number(itemForm.valor_unitario)
              ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

      <button
        onClick={onAdicionar}
        className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg mb-3 transition-colors"
      >
        + Adicionar item
      </button>

      {itens.length > 0 && (
        <table className="w-full text-sm border border-gray-700 rounded-lg overflow-hidden">
          <thead className="bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 text-gray-300">
                Tipo de Trabalho
              </th>
              <th className="text-left px-3 py-2 text-gray-300">Material</th>
              <th className="text-left px-3 py-2 text-gray-300">Qtd</th>
              <th className="text-left px-3 py-2 text-gray-300">Valor Unit.</th>
              <th className="text-left px-3 py-2 text-gray-300">Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, i) => (
              <tr key={i} className="border-t border-gray-700">
                <td className="px-3 py-2">
                  {item.tipo_trabalho ? (
                    <span className="inline-block bg-blue-900/40 text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium">
                      {item.tipo_trabalho}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-200">{item.descricao}</td>
                <td className="px-3 py-2 text-gray-200">
                  {item.quantidade} m²
                </td>
                <td className="px-3 py-2 text-gray-200">
                  R${" "}
                  {item.valor_unitario.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-3 py-2 font-medium text-gray-200">
                  R${" "}
                  {(item.quantidade * item.valor_unitario).toLocaleString(
                    "pt-BR",
                    { minimumFractionDigits: 2 },
                  )}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onRemover(i)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            <tr className="border-t border-gray-700 bg-gray-700">
              <td
                colSpan={4}
                className="px-3 py-2 font-bold text-right text-gray-300"
              >
                Total:
              </td>
              <td colSpan={2} className="px-3 py-2 font-bold text-green-400">
                R${" "}
                {totalOrcamento.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </>
  );
}

export default function Orcamentos() {
  const popup = usePopup();
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [orcamentoEditando, setOrcamentoEditando] = useState(null);
  const [modalCliente, setModalCliente] = useState(false);
  const [formCliente, setFormCliente] = useState({
    nome: "",
    telefone: "",
    email: "",
    endereco: "",
  });
  const [form, setForm] = useState(orcamentoVazio);
  const [itens, setItens] = useState([]);
  const [itemForm, setItemForm] = useState(itemFormVazio);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const orcamentosVencendo = orcamentos.filter((o) => {
    if (!o.validade || o.status !== "pendente") return false;
    const validade = new Date(o.validade + "T12:00:00");
    const diff = (validade - hoje) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  });

  const orcamentosVencidos = orcamentos.filter((o) => {
    if (!o.validade || o.status !== "pendente") return false;
    const validade = new Date(o.validade + "T12:00:00");
    return validade < hoje;
  });

  useEffect(() => {
    carregarDados();
    const canal = supabase
      .channel("orcamentos-changes")
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
    const [{ data: o }, { data: c }, { data: m }] = await Promise.all([
      supabase
        .from("orcamentos")
        .select(
          `*, clientes(nome, telefone, email, endereco), itens_orcamento(quantidade, valor_unitario, tipo_trabalho, materiais(descricao, imagem_url))`,
        )
        .order("criado_em", { ascending: false }),
      supabase.from("clientes").select("id, nome").order("nome"),
      supabase
        .from("materiais")
        .select("id, sku, descricao, saldo, valor_medio")
        .order("descricao"),
    ]);
    setOrcamentos(o || []);
    setClientes(c || []);
    setMateriais(m || []);
    setLoading(false);
  }

  async function abrirEditar(orc) {
    const { data: itensExistentes } = await supabase
      .from("itens_orcamento")
      .select("*, materiais(descricao)")
      .eq("orcamento_id", orc.id);
    setOrcamentoEditando(orc);
    setForm({
      cliente_id: orc.cliente_id,
      data: orc.data,
      validade: orc.validade || "",
      forma_pagamento: orc.forma_pagamento || "",
      observacao: orc.observacao || "",
    });
    setItens(
      (itensExistentes || []).map((i) => ({
        id: i.id,
        material_id: i.material_id,
        descricao: i.materiais?.descricao || "",
        quantidade: Number(i.quantidade),
        valor_unitario: Number(i.valor_unitario),
        tipo_trabalho: i.tipo_trabalho || "",
      })),
    );
    setItemForm(itemFormVazio);
    setModalEditar(true);
  }

  async function salvarEdicao() {
    if (!form.cliente_id) {
      popup.showWarning("Selecione um cliente!");
      return;
    }
    if (itens.length === 0) {
      popup.showWarning("Adicione pelo menos um material!");
      return;
    }
    const total = itens.reduce(
      (acc, i) => acc + i.quantidade * i.valor_unitario,
      0,
    );
    const { error } = await supabase
      .from("orcamentos")
      .update({
        cliente_id: form.cliente_id,
        data: form.data,
        validade: form.validade || null,
        forma_pagamento: form.forma_pagamento,
        observacao: form.observacao,
        valor_total: total,
      })
      .eq("id", orcamentoEditando.id);
    if (error) {
      popup.showError("Erro ao atualizar orçamento.");
      return;
    }
    await supabase
      .from("itens_orcamento")
      .delete()
      .eq("orcamento_id", orcamentoEditando.id);
    await supabase.from("itens_orcamento").insert(
      itens.map((i) => ({
        orcamento_id: orcamentoEditando.id,
        material_id: i.material_id,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        tipo_trabalho: i.tipo_trabalho || null,
      })),
    );
    setModalEditar(false);
    setOrcamentoEditando(null);
    setForm(orcamentoVazio);
    setItens([]);
    popup.showSuccess("Orçamento atualizado com sucesso!");
    carregarDados();
  }

  async function cadastrarCliente() {
    if (!formCliente.nome) {
      await popup.showWarning("Preencha o nome do cliente!");
      return;
    }
    const { data: novoCliente, error } = await supabase
      .from("clientes")
      .insert({
        nome: formCliente.nome,
        telefone: formCliente.telefone || null,
        email: formCliente.email || null,
        endereco: formCliente.endereco || null,
      })
      .select("id, nome")
      .single();
    if (error || !novoCliente?.id) {
      await popup.showError("Erro ao cadastrar cliente. Tente novamente.");
      return;
    }
    await carregarDados();
    setForm((f) => ({ ...f, cliente_id: novoCliente.id }));
    setModalCliente(false);
    setFormCliente({ nome: "", telefone: "", email: "", endereco: "" });
    popup.showSuccess(`Cliente "${formCliente.nome}" cadastrado com sucesso!`);
  }

  function adicionarItem() {
    if (!itemForm.material_id || !itemForm.quantidade) {
      popup.showWarning("Selecione o material e a quantidade!");
      return;
    }
    const mat = materiais.find((m) => m.id === itemForm.material_id);
    setItens((prev) => [
      ...prev,
      {
        material_id: itemForm.material_id,
        descricao: mat?.descricao || "",
        quantidade: Number(itemForm.quantidade),
        valor_unitario:
          Number(itemForm.valor_unitario) || mat?.valor_medio || 0,
        tipo_trabalho: itemForm.tipo_trabalho || "",
      },
    ]);
    setItemForm(itemFormVazio);
  }

  function removerItem(index) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  async function salvar() {
    if (!form.cliente_id) {
      popup.showWarning("Selecione um cliente!");
      return;
    }
    if (itens.length === 0) {
      popup.showWarning("Adicione pelo menos um material!");
      return;
    }
    const totalOrcamento = itens.reduce(
      (acc, i) => acc + i.quantidade * i.valor_unitario,
      0,
    );
    const { data: orc, error } = await supabase
      .from("orcamentos")
      .insert({
        cliente_id: form.cliente_id,
        data: form.data,
        validade: form.validade || null,
        forma_pagamento: form.forma_pagamento,
        observacao: form.observacao,
        valor_total: totalOrcamento,
        status: "pendente",
      })
      .select("id")
      .single();
    if (error || !orc?.id) {
      popup.showError("Erro ao salvar orçamento. Verifique o console.");
      console.error(error);
      return;
    }
    await supabase.from("itens_orcamento").insert(
      itens.map((i) => ({
        orcamento_id: orc.id,
        material_id: i.material_id,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        tipo_trabalho: i.tipo_trabalho || null,
      })),
    );
    setModal(false);
    setForm(orcamentoVazio);
    setItens([]);
    popup.showSuccess("Orçamento salvo com sucesso!");
    carregarDados();
  }

  async function atualizarStatus(id, status) {
    await supabase.from("orcamentos").update({ status }).eq("id", id);
    carregarDados();
  }

  async function converterEmVenda(orc) {
    const confirmado = await popup.confirm(
      "Deseja converter este orçamento em venda?",
    );
    if (!confirmado) return;
    const { data: itensOrc } = await supabase
      .from("itens_orcamento")
      .select("*")
      .eq("orcamento_id", orc.id);
    const { data: venda } = await supabase
      .from("vendas")
      .insert({
        cliente_id: orc.cliente_id,
        data: new Date().toISOString().split("T")[0],
        observacao: `Convertido do orçamento #${orc.id.slice(0, 8)}`,
        valor_total: orc.valor_total,
      })
      .select("id")
      .single();
    if (venda && itensOrc) {
      await supabase.from("itens_venda").insert(
        itensOrc.map((i) => ({
          venda_id: venda.id,
          material_id: i.material_id,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
          tipo_trabalho: i.tipo_trabalho || null,
        })),
      );
      for (const item of itensOrc) {
        const { data: mat } = await supabase
          .from("materiais")
          .select("saldo, saidas")
          .eq("id", item.material_id)
          .single();
        if (mat)
          await supabase
            .from("materiais")
            .update({
              saldo: (mat.saldo || 0) - item.quantidade,
              saidas: (mat.saidas || 0) + item.quantidade,
            })
            .eq("id", item.material_id);
      }
      await supabase
        .from("orcamentos")
        .update({ status: "convertido" })
        .eq("id", orc.id);
      popup.showSuccess("Orçamento convertido em venda com sucesso!");
      carregarDados();
    }
  }

  const fecharModalEditar = () => {
    setModalEditar(false);
    setOrcamentoEditando(null);
    setForm(orcamentoVazio);
    setItens([]);
  };

  return (
    <div className="space-y-4">
      {/* Alertas de validade */}
      {(orcamentosVencendo.length > 0 || orcamentosVencidos.length > 0) && (
        <div className="space-y-2">
          {orcamentosVencidos.length > 0 && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="text-red-400 mt-0.5 shrink-0"
              />
              <div>
                <p className="text-red-300 font-semibold text-sm">
                  {orcamentosVencidos.length} orçamento
                  {orcamentosVencidos.length > 1 ? "s" : ""} vencido
                  {orcamentosVencidos.length > 1 ? "s" : ""}!
                </p>
                <p className="text-red-400 text-xs mt-0.5">
                  {orcamentosVencidos
                    .map(
                      (o) =>
                        `${o.clientes?.nome || "—"} (venceu ${new Date(o.validade + "T12:00:00").toLocaleDateString("pt-BR")})`,
                    )
                    .join(" • ")}
                </p>
              </div>
            </div>
          )}
          {orcamentosVencendo.length > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="text-yellow-400 mt-0.5 shrink-0"
              />
              <div>
                <p className="text-yellow-300 font-semibold text-sm">
                  {orcamentosVencendo.length} orçamento
                  {orcamentosVencendo.length > 1 ? "s" : ""} vencendo em breve!
                </p>
                <p className="text-yellow-400 text-xs mt-0.5">
                  {orcamentosVencendo
                    .map((o) => {
                      const diff = Math.ceil(
                        (new Date(o.validade + "T12:00:00") - hoje) /
                          (1000 * 60 * 60 * 24),
                      );
                      return `${o.clientes?.nome || "—"} (${diff === 0 ? "vence hoje" : `${diff} dia${diff > 1 ? "s" : ""}`})`;
                    })
                    .join(" • ")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => {
            setForm(orcamentoVazio);
            setItens([]);
            setItemForm(itemFormVazio);
            setModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Novo Orçamento
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-700 border-b border-gray-600">
            <tr>
              <th className="text-center px-4 py-3 text-gray-300">Data</th>
              <th className="text-center px-4 py-3 text-gray-300">Cliente</th>
              <th className="text-center px-4 py-3 text-gray-300">
                Materiais / Serviços
              </th>
              <th className="text-center px-4 py-3 text-gray-300">
                Qtd. Total
              </th>
              <th className="text-center px-4 py-3 text-gray-300">Validade</th>
              <th className="text-center px-4 py-3 text-gray-300">
                Valor Total
              </th>
              <th className="text-center px-4 py-3 text-gray-300">Status</th>
              <th className="text-center px-4 py-3 text-gray-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : orcamentos.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  Nenhum orçamento registrado.
                </td>
              </tr>
            ) : (
              orcamentos.map((o) => {
                const validadeDate = o.validade
                  ? new Date(o.validade + "T12:00:00")
                  : null;
                const diffDias = validadeDate
                  ? (validadeDate - hoje) / (1000 * 60 * 60 * 24)
                  : null;
                const rowClass =
                  o.status === "pendente" && validadeDate
                    ? validadeDate < hoje
                      ? "bg-red-900/10"
                      : diffDias <= 3
                        ? "bg-yellow-900/10"
                        : ""
                    : "";
                return (
                  <tr
                    key={o.id}
                    className={`border-b border-gray-700 hover:bg-gray-700 ${rowClass}`}
                  >
                    <td className="px-4 py-3 text-center text-gray-400">
                      {new Date(o.data).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {o.clientes?.nome || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {(o.itens_orcamento || []).length === 0 ? (
                        "—"
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {o.itens_orcamento.map((item, i) => (
                            <div
                              key={i}
                              className="inline-flex items-center gap-1.5 flex-nowrap whitespace-nowrap"
                            >
                              <span className="text-xs text-gray-300">
                                {item.materiais?.descricao}
                              </span>
                              {item.tipo_trabalho && (
                                <span className="text-xs bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded-full shrink-0">
                                  {item.tipo_trabalho}
                                </span>
                              )}
                              <BotaoVisualizar
                                item={{
                                  descricao: item.materiais?.descricao || "",
                                  imagem_url:
                                    item.materiais?.imagem_url || null,
                                  tipo_trabalho: item.tipo_trabalho || "",
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {(o.itens_orcamento || [])
                        .reduce(
                          (acc, item) => acc + Number(item.quantidade || 0),
                          0,
                        )
                        .toLocaleString("pt-BR")}{" "}
                      m²
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {o.validade
                        ? new Date(o.validade).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      R${" "}
                      {(o.valor_total || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusCores[o.status] || statusCores.pendente}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap justify-center">
                        {o.status === "pendente" && (
                          <>
                            <button
                              onClick={() => abrirEditar(o)}
                              className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-500 flex items-center gap-1"
                            >
                              <Pencil size={12} /> Editar
                            </button>
                            <button
                              onClick={() => atualizarStatus(o.id, "aprovado")}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => atualizarStatus(o.id, "recusado")}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                            >
                              Recusar
                            </button>
                            <button
                              onClick={() =>
                                gerarPDFOrcamento(
                                  o,
                                  o.itens_orcamento.map((i) => ({
                                    descricao: i.materiais?.descricao || "",
                                    quantidade: i.quantidade,
                                    valor_unitario: i.valor_unitario,
                                    tipo_trabalho: i.tipo_trabalho || "",
                                    imagem_url: i.materiais?.imagem_url || null,
                                  })),
                                  o.clientes,
                                )
                              }
                              className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1"
                            >
                              📄 PDF
                            </button>
                          </>
                        )}
                        {o.status === "aprovado" && (
                          <button
                            onClick={() => converterEmVenda(o)}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
                          >
                            <CheckCircle size={12} /> Converter em Venda
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Orçamento */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">
                Novo Orçamento
              </h3>
              <button
                onClick={() => setModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <FormCabecalho
              form={form}
              setForm={setForm}
              clientes={clientes}
              onNovoCliente={() => setModalCliente(true)}
            />
            <div className="border-t border-gray-700 pt-4">
              <h4 className="font-medium text-gray-300 mb-3">
                Materiais do Orçamento
              </h4>
              <FormItens
                materiais={materiais}
                itens={itens}
                itemForm={itemForm}
                setItemForm={setItemForm}
                onAdicionar={adicionarItem}
                onRemover={removerItem}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(false)}
                className="flex-1 border border-gray-600 text-gray-400 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Salvar Orçamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Orçamento */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">
                Editar Orçamento
              </h3>
              <button
                onClick={fecharModalEditar}
                className="text-gray-400 hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <FormCabecalho
              form={form}
              setForm={setForm}
              clientes={clientes}
              onNovoCliente={() => setModalCliente(true)}
            />
            <div className="border-t border-gray-700 pt-4">
              <h4 className="font-medium text-gray-300 mb-3">
                Materiais do Orçamento
              </h4>
              <FormItens
                materiais={materiais}
                itens={itens}
                itemForm={itemForm}
                setItemForm={setItemForm}
                onAdicionar={adicionarItem}
                onRemover={removerItem}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={fecharModalEditar}
                className="flex-1 border border-gray-600 text-gray-400 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Cliente */}
      {modalCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">
                Novo Cliente
              </h3>
              <button
                onClick={() => {
                  setModalCliente(false);
                  setFormCliente({
                    nome: "",
                    telefone: "",
                    email: "",
                    endereco: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">Nome *</label>
                <input
                  type="text"
                  value={formCliente.nome}
                  onChange={(e) =>
                    setFormCliente((f) => ({ ...f, nome: e.target.value }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                  placeholder="Nome do cliente"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Telefone</label>
                <input
                  type="text"
                  value={formCliente.telefone}
                  onChange={(e) =>
                    setFormCliente((f) => ({ ...f, telefone: e.target.value }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                  placeholder="(91) 99999-9999"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">E-mail</label>
                <input
                  type="email"
                  value={formCliente.email}
                  onChange={(e) =>
                    setFormCliente((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                  placeholder="email@cliente.com"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Endereço</label>
                <input
                  type="text"
                  value={formCliente.endereco}
                  onChange={(e) =>
                    setFormCliente((f) => ({ ...f, endereco: e.target.value }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                  placeholder="Rua, número, cidade..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setModalCliente(false);
                  setFormCliente({
                    nome: "",
                    telefone: "",
                    email: "",
                    endereco: "",
                  });
                }}
                className="flex-1 border border-gray-600 text-gray-400 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={cadastrarCliente}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
