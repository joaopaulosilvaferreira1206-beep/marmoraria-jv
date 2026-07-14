import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { usePopup } from "../components/PopupProvider";
import { exportarClientesPDF, exportarClientesExcel } from "../lib/exportar";
import { useAuth } from "../lib/AuthContext";
import { useBusca } from "../lib/buscaContext";

const clienteVazio = {
  nome: "",
  telefone: "",
  email: "",
  endereco: "",
};

export default function Clientes({ onlyModal, onClose, onSuccess }) {
  const { pode } = useAuth();
  const popup = usePopup();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(onlyModal || false);
  const [form, setForm] = useState(clienteVazio);
  const [editando, setEditando] = useState(null);
  const { itemDestacado } = useBusca();
  const rowRefs = useRef({});

  // Scroll automático até o item destacado
  useEffect(() => {
    if (itemDestacado?.tabela === "clientes" && itemDestacado?.id) {
      const el = rowRefs.current[itemDestacado.id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [itemDestacado]);

  useEffect(() => {
    carregarClientes();
    const canal = supabase
      .channel("clientes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes" },
        carregarClientes,
      )
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  async function carregarClientes() {
    setLoading(true);
    const { data } = await supabase.from("clientes").select("*").order("nome");
    setClientes(data || []);
    setLoading(false);
  }

  async function salvar() {
    if (!form.nome) {
      popup.showWarning("Preencha o nome do cliente!");
      return;
    }
    if (editando) {
      await supabase.from("clientes").update(form).eq("id", editando);
    } else {
      await supabase.from("clientes").insert(form);
    }
    setModal(false);
    setForm(clienteVazio);
    setEditando(null);
    if (onlyModal) {
      onSuccess();
    } else {
      carregarClientes();
    }
  }

  function fecharModal() {
    setModal(false);
    setForm(clienteVazio);
    setEditando(null);
    if (onlyModal && onClose) onClose();
  }

  async function excluir(id) {
    const confirmado = await popup.confirm(
      "Deseja excluir este cliente? Todas as vendas e orçamentos relacionados também serão removidos.",
    );
    if (!confirmado) return;

    const { data: vendas } = await supabase
      .from("vendas")
      .select("id")
      .eq("cliente_id", id);
    if (vendas) {
      for (const venda of vendas) {
        await supabase.from("itens_venda").delete().eq("venda_id", venda.id);
      }
      await supabase.from("vendas").delete().eq("cliente_id", id);
    }

    const { data: orcamentos } = await supabase
      .from("orcamentos")
      .select("id")
      .eq("cliente_id", id);
    if (orcamentos) {
      for (const orc of orcamentos) {
        await supabase
          .from("itens_orcamento")
          .delete()
          .eq("orcamento_id", orc.id);
      }
      await supabase.from("orcamentos").delete().eq("cliente_id", id);
    }

    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) {
      popup.showError("Erro ao excluir cliente: " + error.message);
      return;
    }
    popup.showSuccess(
      "Cliente e todos os registros relacionados foram excluídos!",
    );
    carregarClientes();
  }

  function abrirEditar(c) {
    setForm({
      nome: c.nome,
      telefone: c.telefone || "",
      email: c.email || "",
      endereco: c.endereco || "",
    });
    setEditando(c.id);
    setModal(true);
  }

  const filtrados = clientes

  return (
    <div className={onlyModal ? "" : "space-y-4"}>
      {!onlyModal && (
        <>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => exportarClientesPDF(clientes)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
        >
          PDF
        </button>
        <button
          onClick={() => exportarClientesExcel(clientes)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
        >
          Excel
        </button>
        <button
          onClick={() => {
            setForm(clienteVazio);
            setEditando(null);
            setModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-700 border-b border-gray-600">
            <tr>
              <th className="text-center px-4 py-3 text-gray-300">Nome</th>
              <th className="text-center px-4 py-3 text-gray-300">Telefone</th>
              <th className="text-center px-4 py-3 text-gray-300">Email</th>
              <th className="text-center px-4 py-3 text-gray-300">Endereço</th>
              <th className="text-center px-4 py-3 text-gray-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line no-nested-ternary */}
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((c) => {
                const destacado =
                  itemDestacado?.tabela === "clientes" &&
                  itemDestacado?.id === c.id;
                return (
                  <tr
                    key={c.id}
                    ref={(el) => (rowRefs.current[c.id] = el)}
                    className={`border-b border-gray-700 transition-all duration-500 ${
                      destacado
                        ? "bg-gray-500/20 ring-2 ring-inset ring-gray-500/60"
                        : "hover:bg-gray-700"
                    }`}
                  >
                    <td
                      className={`px-4 py-3 text-center font-medium ${destacado ? "text-blue-200" : "text-gray-400"}`}
                    >
                      {c.nome}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {c.telefone || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {c.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {c.endereco || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => abrirEditar(c)}
                          className="text-blue-400 hover:text-blue-300 p-2.5 rounded-lg"
                        >
                          <Pencil size={16} />
                        </button>
                        {pode.apagarRegistros && (
                          <button
                            onClick={() => excluir(c.id)}
                            className="text-red-400 hover:text-red-300 p-2.5 rounded-lg"
                          >
                            <Trash2 size={16} />
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
      </>
      )}

      {/* Modal Cadastro/Edição */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">
                {editando ? "Editar Cliente" : "Novo Cliente"}
              </h3>
              <button
                onClick={fecharModal}
                className="text-gray-400 hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full border border-gray-600 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do cliente"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) =>
                    setForm({ ...form, telefone: e.target.value })
                  }
                  className="w-full border border-gray-600 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(91) 99999-9999"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-600 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@cliente.com"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Endereço</label>
                <input
                  type="text"
                  value={form.endereco}
                  onChange={(e) =>
                    setForm({ ...form, endereco: e.target.value })
                  }
                  className="w-full border border-gray-600 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rua, número, cidade..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={fecharModal}
                className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                {editando ? "Salvar Alterações" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
