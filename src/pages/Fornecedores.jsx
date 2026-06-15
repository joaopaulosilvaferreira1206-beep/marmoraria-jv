import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { usePopup } from "../components/PopupProvider";
import { useAuth } from "../lib/AuthContext";
import { useBusca } from "../lib/buscaContext";

const fornecedorVazio = {
  nome: "",
  telefone: "",
  email: "",
  endereco: "",
};

export default function Fornecedores() {
  const { pode } = useAuth();
  const popup = usePopup();
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(fornecedorVazio);
  const [editando, setEditando] = useState(null);
  const { itemDestacado } = useBusca();
  const rowRefs = useRef({});

  // Scroll automático até o item destacado
  useEffect(() => {
    if (itemDestacado?.tabela === "fornecedores" && itemDestacado?.id) {
      const el = rowRefs.current[itemDestacado.id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [itemDestacado]);

  useEffect(() => {
    carregarFornecedores();
    const canal = supabase
      .channel("fornecedores-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fornecedores" },
        carregarFornecedores,
      )
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  async function carregarFornecedores() {
    setLoading(true);
    const { data } = await supabase
      .from("fornecedores")
      .select("*")
      .order("nome");
    setFornecedores(data || []);
    setLoading(false);
  }

  async function salvar() {
    if (!form.nome) {
      await popup.showWarning("Preencha o nome do fornecedor!");
      return;
    }
    if (editando) {
      await supabase.from("fornecedores").update(form).eq("id", editando);
    } else {
      await supabase.from("fornecedores").insert(form);
    }
    setModal(false);
    setForm(fornecedorVazio);
    setEditando(null);
    carregarFornecedores();
  }

  async function excluir(id) {
    const confirmado = await popup.confirm(
      "Deseja excluir este fornecedor? Todas as entradas e pedidos relacionados também serão removidos.",
    );
    if (!confirmado) return;

    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("id")
      .eq("fornecedor_id", id);
    if (pedidos) {
      for (const pedido of pedidos) {
        await supabase.from("itens_pedido").delete().eq("pedido_id", pedido.id);
      }
      await supabase.from("pedidos").delete().eq("fornecedor_id", id);
    }

    await supabase.from("entradas").delete().eq("fornecedor_id", id);

    const { error } = await supabase.from("fornecedores").delete().eq("id", id);
    if (error) {
      popup.showError("Erro ao excluir fornecedor: " + error.message);
      return;
    }
    popup.showSuccess(
      "Fornecedor e todos os registros relacionados foram excluídos!",
    );
    carregarFornecedores();
  }

  function abrirEditar(f) {
    setForm({
      nome: f.nome,
      telefone: f.telefone || "",
      email: f.email || "",
      endereco: f.endereco || "",
    });
    setEditando(f.id);
    setModal(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setForm(fornecedorVazio);
            setEditando(null);
            setModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Novo Fornecedor
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
            ) : fornecedores.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Nenhum fornecedor cadastrado.
                </td>
              </tr>
            ) : (
              fornecedores.map((f) => {
                const destacado =
                  itemDestacado?.tabela === "fornecedores" &&
                  itemDestacado?.id === f.id;
                return (
                  <tr
                    key={f.id}
                    ref={(el) => (rowRefs.current[f.id] = el)}
                    className={`border-b border-gray-700 transition-all duration-500 ${
                      destacado
                        ? "bg-gray-500/20 ring-2 ring-inset ring-gray-500/60"
                        : "hover:bg-gray-700"
                    }`}
                  >
                    <td
                      className={`px-4 py-3 text-center font-medium ${destacado ? "text-yellow-200" : "text-gray-400"}`}
                    >
                      {f.nome}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {f.telefone || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {f.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {f.endereco || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => abrirEditar(f)}
                          className="text-blue-400 hover:text-blue-300 p-2.5 rounded-lg"
                        >
                          <Pencil size={16} />
                        </button>
                        {pode.apagarRegistros && (
                          <button
                            onClick={() => excluir(f.id)}
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

      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto flex items-start justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">
                {editando ? "Editar Fornecedor" : "Novo Fornecedor"}
              </h3>
              <button
                onClick={() => setModal(false)}
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
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                  placeholder="Nome do fornecedor"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) =>
                    setForm({ ...form, telefone: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                  placeholder="(91) 99999-9999"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                  placeholder="email@fornecedor.com"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Endereço</label>
                <input
                  type="text"
                  value={form.endereco}
                  onChange={(e) =>
                    setForm({ ...form, endereco: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                  placeholder="Rua, número, cidade..."
                />
              </div>
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
                {editando ? "Salvar Alterações" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
