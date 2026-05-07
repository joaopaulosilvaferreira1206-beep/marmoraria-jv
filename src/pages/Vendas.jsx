import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Plus, X, Trash2 } from "lucide-react";
import { usePopup } from "../components/PopupProvider";
import { emitirEstoqueAtualizado } from "../lib/estoqueEvents";
import { useAuth } from "../lib/AuthContext";
import SelectBusca from "../components/SelectBusca";
import SelectOuDigita from "../components/SelectOuDigita";
import { BotaoVisualizar } from "../components/Visualizador3D";

const vendaVazia = {
  cliente_id: "",
  data: new Date().toISOString().split("T")[0],
  forma_pagamento: "",
  observacao: "",
};

// ─────────────────────────────────────────────────────────────
// FormItensVenda — fora do componente principal
// ─────────────────────────────────────────────────────────────
function FormItensVenda({
  materiais,
  itens,
  itemForm,
  setItemForm,
  onAdicionar,
  onRemover,
  podeApagar,
}) {
  const totalVenda = itens.reduce(
    (acc, i) => acc + i.quantidade * i.valor_unitario,
    0,
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* Material */}
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

        {/* Tipo de Trabalho por item */}
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

        {/* Largura */}
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

        {/* Comprimento */}
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

        {/* Área calculada */}
        <div>
          <label className="text-xs text-gray-400">Área calculada (m²)</label>
          <input
            type="number"
            readOnly
            value={itemForm.quantidade}
            className="w-full bg-gray-700 border border-gray-600 text-blue-400 rounded-lg px-3 py-2 mt-1 opacity-75 cursor-not-allowed font-bold"
          />
        </div>

        {/* Desconto */}
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

        {/* Custo unit. */}
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

        {/* Preço de venda */}
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

      {/* Subtotal preview */}
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
              <th className="text-left px-3 py-2 text-gray-300">Material</th>
              <th className="text-left px-3 py-2 text-gray-300">
                Tipo de Trabalho
              </th>
              <th className="text-left px-3 py-2 text-gray-300">Qtd</th>
              <th className="text-left px-3 py-2 text-gray-300">Valor Unit.</th>
              <th className="text-left px-3 py-2 text-gray-300">Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, i) => (
              <tr key={i} className="border-t border-gray-700">
                <td className="px-3 py-2 text-gray-200">{item.descricao}</td>
                <td className="px-3 py-2">
                  {item.tipo_trabalho ? (
                    <span className="inline-block bg-blue-900/40 text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium">
                      {item.tipo_trabalho}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs">—</span>
                  )}
                </td>
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
                  {podeApagar && (
                    <button
                      onClick={() => onRemover(i)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
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
                {totalVenda.toLocaleString("pt-BR", {
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

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export default function Vendas() {
  const { pode } = useAuth();
  const popup = usePopup();
  const [vendas, setVendas] = useState([]);
  const [quantidadePorVenda, setQuantidadePorVenda] = useState({});
  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [modalCliente, setModalCliente] = useState(false);
  const [formCliente, setFormCliente] = useState({
    nome: "",
    telefone: "",
    email: "",
    endereco: "",
  });
  const [form, setForm] = useState(vendaVazia);
  const [itens, setItens] = useState([]);
  const [itemForm, setItemForm] = useState({
    material_id: "",
    largura: "",
    comprimento: "",
    quantidade: "",
    valor_unitario: "",
    desconto: "",
    tipo_trabalho: "",
  });

  useEffect(() => {
    carregarDados();
    const canal = supabase
      .channel("vendas-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas" },
        carregarDados,
      )
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  async function carregarDados() {
    setLoading(true);
    const [{ data: v }, { data: c }, { data: m }, { data: iv }] =
      await Promise.all([
        // ✅ Busca imagem_url para o visualizador 3D
        supabase
          .from("vendas")
          .select(
            "*, clientes(nome), itens_venda(quantidade, tipo_trabalho, materiais(descricao, imagem_url))",
          )
          .order("data", { ascending: false }),
        supabase.from("clientes").select("id, nome").order("nome"),
        supabase
          .from("materiais")
          .select("id, sku, descricao, saldo, valor_medio, saidas, valor_total")
          .order("descricao"),
        supabase.from("itens_venda").select("venda_id, quantidade"),
      ]);

    const totais = (iv || []).reduce((acc, item) => {
      acc[item.venda_id] =
        (acc[item.venda_id] || 0) + Number(item.quantidade || 0);
      return acc;
    }, {});

    setVendas(v || []);
    setQuantidadePorVenda(totais);
    setClientes(c || []);
    setMateriais(m || []);
    setLoading(false);
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
    if (Number(itemForm.quantidade) > (mat?.saldo || 0)) {
      popup.showWarning(
        `Saldo insuficiente!\nDisponível: ${mat?.saldo || 0} m²`,
      );
      return;
    }
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
    setItemForm({
      material_id: "",
      largura: "",
      comprimento: "",
      quantidade: "",
      valor_unitario: "",
      desconto: "",
      tipo_trabalho: "",
    });
  }

  function removerItem(index) {
    setItens(itens.filter((_, i) => i !== index));
  }

  async function salvar() {
    if (!form.cliente_id) {
      await popup.showWarning("Selecione um cliente!");
      return;
    }
    if (itens.length === 0) {
      await popup.showWarning("Adicione pelo menos um material!");
      return;
    }

    for (const item of itens) {
      const mat = materiais.find((m) => m.id === item.material_id);
      if (mat && item.quantidade > mat.saldo) {
        await popup.showWarning(
          `Saldo insuficiente para "${mat.descricao}"!\nDisponível: ${mat.saldo} m²\nSolicitado: ${item.quantidade} m²`,
        );
        return;
      }
    }

    const totalVenda = itens.reduce(
      (acc, i) => acc + i.quantidade * i.valor_unitario,
      0,
    );

    const { data: venda } = await supabase
      .from("vendas")
      .insert({
        cliente_id: form.cliente_id,
        data: form.data,
        forma_pagamento: form.forma_pagamento,
        observacao: form.observacao,
        valor_total: totalVenda,
      })
      .select("id")
      .single();

    if (venda) {
      await supabase.from("itens_venda").insert(
        itens.map((i) => ({
          venda_id: venda.id,
          material_id: i.material_id,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
          tipo_trabalho: i.tipo_trabalho || null,
        })),
      );

      const qtdPorMaterial = itens.reduce((acc, item) => {
        acc[item.material_id] =
          (acc[item.material_id] || 0) + Number(item.quantidade || 0);
        return acc;
      }, {});

      for (const materialId of Object.keys(qtdPorMaterial)) {
        const qtd = qtdPorMaterial[materialId];
        const { data: matAtual } = await supabase
          .from("materiais")
          .select("saldo, saidas, valor_medio")
          .eq("id", materialId)
          .single();
        if (!matAtual) continue;

        // Bloqueia se saldo for insuficiente (verificação com dado fresco do banco)
        if (qtd > matAtual.saldo) {
          await popup.showError(
            `Saldo insuficiente para um dos materiais no momento do registro!\nOperação cancelada.`,
          );
          // Desfaz a venda inserida
          await supabase.from("itens_venda").delete().eq("venda_id", venda.id);
          await supabase.from("vendas").delete().eq("id", venda.id);
          carregarDados();
          return;
        }

        const novoSaldo = Math.max(0, (matAtual.saldo || 0) - qtd);
        await supabase
          .from("materiais")
          .update({
            saldo: novoSaldo,
            saidas: (matAtual.saidas || 0) + qtd,
            valor_total: (matAtual.valor_medio || 0) * novoSaldo,
          })
          .eq("id", materialId);
      }

      emitirEstoqueAtualizado();
    }

    setModal(false);
    setForm(vendaVazia);
    setItens([]);
    carregarDados();
  }

  function formatarDataHora(registro) {
    const valor = registro.criado_em || registro.data;
    if (!valor) return "—";
    const valorUTC = valor.endsWith("Z") ? valor : valor + "Z";
    return new Date(valorUTC).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setForm(vendaVazia);
            setItens([]);
            setItemForm({
              material_id: "",
              largura: "",
              comprimento: "",
              quantidade: "",
              valor_unitario: "",
              desconto: "",
              tipo_trabalho: "",
            });
            setModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Nova Venda
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-700 border-b border-gray-600">
            <tr>
              <th className="text-center px-4 py-3 text-gray-300">Data/Hora</th>
              <th className="text-center px-4 py-3 text-gray-300">Cliente</th>
              <th className="text-center px-4 py-3 text-gray-300">
                Materiais / Serviços
              </th>
              <th className="text-center px-4 py-3 text-gray-300">
                Qtd. Material
              </th>
              <th className="text-center px-4 py-3 text-gray-300">Pagamento</th>
              <th className="text-center px-4 py-3 text-gray-300">
                Valor Total
              </th>
              <th className="text-center px-4 py-3 text-gray-300">
                Observação
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : vendas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Nenhuma venda registrada.
                </td>
              </tr>
            ) : (
              vendas.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-gray-700 hover:bg-gray-700"
                >
                  <td className="px-4 py-3 text-gray-400">
                    {formatarDataHora(v)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-center">
                    {v.clientes?.nome || "—"}
                  </td>
                  {/* ✅ ITEM 1: linha única por material + ITEM 2: botão visualizar */}
                  <td className="px-4 py-3 text-center text-gray-400">
                    {(v.itens_venda || []).length === 0 ? (
                      "—"
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {v.itens_venda.map((item, i) => (
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
                                imagem_url: item.materiais?.imagem_url || null,
                                tipo_trabalho: item.tipo_trabalho || "",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-center">
                    {(quantidadePorVenda[v.id] || 0).toLocaleString("pt-BR")} m²
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-center">
                    {v.forma_pagamento || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-center">
                    R${" "}
                    {(v.valor_total || 0).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-center">
                    {v.observacao || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nova Venda */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">
                Nova Venda
              </h3>
              <button
                onClick={() => setModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="sm:col-span-1">
                <label className="text-sm text-gray-400">Cliente *</label>
                <div className="mt-1 flex gap-2">
                  <div className="flex-1 min-w-0">
                    <SelectBusca
                      opcoes={clientes}
                      valor={form.cliente_id}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, cliente_id: v }))
                      }
                      placeholder="Selecione o cliente..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalCliente(true)}
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, data: e.target.value }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">
                  Forma de Pagamento
                </label>
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
                    onChange={(v) =>
                      setForm((f) => ({ ...f, forma_pagamento: v }))
                    }
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

            <div className="border-t border-gray-700 pt-4">
              <h4 className="font-medium text-gray-300 mb-3">
                Materiais da Venda
              </h4>
              <FormItensVenda
                materiais={materiais}
                itens={itens}
                itemForm={itemForm}
                setItemForm={setItemForm}
                onAdicionar={adicionarItem}
                onRemover={removerItem}
                podeApagar={pode.apagarRegistros}
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
                Registrar Venda
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
