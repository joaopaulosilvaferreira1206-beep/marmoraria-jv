import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Plus, Pencil, Trash2, X, Image } from "lucide-react";
import { usePopup } from "../components/PopupProvider";
import { exportarEstoquePDF, exportarEstoqueExcel } from "../lib/exportar";
import { useAuth } from "../lib/AuthContext";
import { useBusca } from "../lib/buscaContext";

const materialVazio = {
  descricao: "",
  minimo: "",
  maximo: "",
  unidade: "M²",
  custo: "",
};

export default function Estoque() {
  const { pode } = useAuth();
  const popup = usePopup();
  const [materiais, setMateriais] = useState([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(materialVazio);
  const [editando, setEditando] = useState(null);
  const [imagemFile, setImagemFile] = useState(null);
  const [imagemPreview, setImagemPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [modalImagem, setModalImagem] = useState(null);
  const { itemDestacado } = useBusca();
  const rowRefs = useRef({});

  // Scroll automático até o item destacado
  useEffect(() => {
    if (itemDestacado?.tabela === "materiais" && itemDestacado?.id) {
      const el = rowRefs.current[itemDestacado.id];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [itemDestacado]);

  useEffect(() => {
    carregarMateriais();
    const canal = supabase
      .channel("estoque-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "materiais" },
        carregarMateriais,
      )
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  async function carregarMateriais() {
    setLoading(true);
    const { data } = await supabase
      .from("materiais")
      .select("*")
      .order("descricao");
    setMateriais(data || []);
    setLoading(false);
  }

  function handleImagemChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImagemFile(file);
    setImagemPreview(URL.createObjectURL(file));
  }

  async function salvar() {
    if (!form.descricao) {
      popup.showWarning("Preencha a Descrição!");
      return;
    }

    setUploading(true);
    let imagemUrl = form.imagem_url || null;

    if (imagemFile) {
      const ext = imagemFile.name.split(".").pop();
      const nomeArquivo = `material_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("materiais")
        .upload(nomeArquivo, imagemFile, { upsert: true });

      if (uploadError) {
        popup.showError("Erro ao fazer upload da imagem.");
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("materiais")
        .getPublicUrl(nomeArquivo);
      imagemUrl = urlData.publicUrl;
    }

    if (editando) {
      await supabase
        .from("materiais")
        .update({
          descricao: form.descricao,
          minimo: Math.max(0, Number(form.minimo) || 0),
          maximo: Math.max(0, Number(form.maximo) || 0),
          unidade: form.unidade,
          imagem_url: imagemUrl,
          valor_medio: Number(form.custo) || 0,
        })
        .eq("id", editando);
    } else {
      const { data: ultimo } = await supabase
        .from("materiais")
        .select("sku")
        .order("sku", { ascending: false })
        .limit(1)
        .single();
      const novoCodigo = (ultimo?.sku || 0) + 1;
      await supabase.from("materiais").insert({
        sku: novoCodigo,
        descricao: form.descricao,
        valor_medio: Number(form.custo) || 0,
        minimo: Math.max(0, Number(form.minimo) || 0),
        maximo: Math.max(0, Number(form.maximo) || 0),
        unidade: form.unidade,
        imagem_url: imagemUrl,
        saldo: 0,
        entradas: 0,
        saidas: 0,
        perdas: 0,
        valor_total: 0,
      });
    }

    setUploading(false);
    setModal(false);
    setForm(materialVazio);
    setEditando(null);
    setImagemFile(null);
    setImagemPreview(null);
    carregarMateriais();
  }

  async function excluir(id) {
    const confirmado = await popup.confirm(
      "Deseja excluir este material? Todos os registros relacionados também serão removidos.",
    );
    if (!confirmado) return;

    await supabase.from("itens_venda").delete().eq("material_id", id);
    await supabase.from("itens_orcamento").delete().eq("material_id", id);
    await supabase.from("itens_pedido").delete().eq("material_id", id);
    await supabase.from("entradas").delete().eq("material_id", id);
    await supabase.from("perdas").delete().eq("material_id", id);

    const { data: orcsVazios } = await supabase.from("orcamentos").select("id");
    if (orcsVazios) {
      for (const orc of orcsVazios) {
        const { count } = await supabase
          .from("itens_orcamento")
          .select("id", { count: "exact", head: true })
          .eq("orcamento_id", orc.id);
        if (count === 0)
          await supabase.from("orcamentos").delete().eq("id", orc.id);
      }
    }

    const { data: vendasVazias } = await supabase.from("vendas").select("id");
    if (vendasVazias) {
      for (const venda of vendasVazias) {
        const { count } = await supabase
          .from("itens_venda")
          .select("id", { count: "exact", head: true })
          .eq("venda_id", venda.id);
        if (count === 0)
          await supabase.from("vendas").delete().eq("id", venda.id);
      }
    }

    const { data: pedidosVazios } = await supabase.from("pedidos").select("id");
    if (pedidosVazios) {
      for (const pedido of pedidosVazios) {
        const { count } = await supabase
          .from("itens_pedido")
          .select("id", { count: "exact", head: true })
          .eq("pedido_id", pedido.id);
        if (count === 0)
          await supabase.from("pedidos").delete().eq("id", pedido.id);
      }
    }

    const { error } = await supabase.from("materiais").delete().eq("id", id);
    if (error) {
      popup.showError("Erro ao excluir material: " + error.message);
      return;
    }

    popup.showSuccess(
      "Material e todos os registros relacionados foram excluídos!",
    );
    carregarMateriais();
  }

  function abrirEditar(m) {
    setForm({
      descricao: m.descricao,
      minimo: m.minimo ?? "",
      maximo: m.maximo ?? "",
      unidade: m.unidade || "M²",
      imagem_url: m.imagem_url || null,
      custo: m.valor_medio ?? "",
    });
    setImagemPreview(m.imagem_url || null);
    setImagemFile(null);
    setEditando(m.id);
    setModal(true);
  }

  const filtrados = materiais.filter(
    (m) =>
      m.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      String(m.sku).includes(busca),
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => exportarEstoquePDF(materiais)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
        >
          PDF
        </button>
        <button
          onClick={() => exportarEstoqueExcel(materiais)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
        >
          Excel
        </button>
        <button
          onClick={() => {
            setForm(materialVazio);
            setEditando(null);
            setImagemFile(null);
            setImagemPreview(null);
            setModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Novo Material
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-700 border-b border-gray-600">
            <tr>
              <th className="text-center px-4 py-3 text-gray-300">Foto</th>
              <th className="text-center px-4 py-3 text-gray-300">Código</th>
              <th className="text-center px-4 py-3 text-gray-300">Descrição</th>
              <th className="text-center px-4 py-3 text-gray-300">Saldo</th>
              <th className="text-center px-4 py-3 text-gray-300">Mín.</th>
              <th className="text-center px-4 py-3 text-gray-300">Máx.</th>
              <th className="text-center px-4 py-3 text-gray-300">
                Custo Unit.
              </th>
              <th className="text-center px-4 py-3 text-gray-300">Unidade</th>
              <th className="text-center px-4 py-3 text-gray-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Nenhum material encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((m) => {
                const destacado =
                  itemDestacado?.tabela === "materiais" &&
                  itemDestacado?.id === m.id;
                return (
                  <tr
                    key={m.id}
                    ref={(el) => (rowRefs.current[m.id] = el)}
                    className={`border-b border-gray-700 transition-all duration-500 ${
                      destacado
                        ? "bg-gray-500/20 ring-2 ring-inset ring-gray-500/60"
                        : "hover:bg-gray-700"
                    }`}
                  >
                    <td className="px-4 py-3 flex justify-center">
                      {m.imagem_url ? (
                        <img
                          src={m.imagem_url}
                          alt={m.descricao}
                          className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-80 transition"
                          onClick={() => setModalImagem(m)}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                          <Image size={16} className="text-gray-500" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {m.sku}
                    </td>
                    <td
                      className={`px-4 py-3 text-center font-medium ${destacado ? "text-yellow-200" : "text-gray-400"}`}
                    >
                      {m.descricao}
                    </td>
                    <td
                      className={`px-4 py-3 font-bold text-center ${m.minimo && m.saldo <= m.minimo ? "text-red-400" : "text-gray-400"}`}
                    >
                      {parseFloat((m.saldo ?? 0).toFixed(2))}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {m.minimo ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {m.maximo ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      R${" "}
                      {(m.valor_medio || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-center">
                      {m.unidade}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => abrirEditar(m)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Pencil size={16} />
                        </button>
                        {pode.apagarRegistros && (
                          <button
                            onClick={() => excluir(m.id)}
                            className="text-red-400 hover:text-red-300"
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

      {/* Modal cadastro/edição */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">
                {editando ? "Editar Material" : "Novo Material"}
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
                <label className="text-sm text-gray-300">Descrição *</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) =>
                    setForm({ ...form, descricao: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-300">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minimo}
                    onChange={(e) => {
                      if (Number(e.target.value) < 0) {
                        popup.showWarning(
                          "Não são permitidos valores negativos! Digite apenas valores positivos.",
                        );
                        return;
                      }
                      setForm({ ...form, minimo: e.target.value });
                    }}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">
                    Estoque Máximo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.maximo}
                    onChange={(e) => {
                      if (Number(e.target.value) < 0) {
                        popup.showWarning(
                          "Não são permitidos valores negativos! Digite apenas valores positivos.",
                        );
                        return;
                      }
                      setForm({ ...form, maximo: e.target.value });
                    }}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-300">
                  Custo Unitário (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.custo}
                  onChange={(e) => {
                    if (Number(e.target.value) < 0) {
                      popup.showWarning(
                        "Não são permitidos valores negativos! Digite apenas valores positivos.",
                      );
                      return;
                    }
                    setForm({ ...form, custo: e.target.value });
                  }}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Unidade</label>
                <select
                  value={form.unidade}
                  onChange={(e) =>
                    setForm({ ...form, unidade: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-blue-500"
                >
                  <option>M²</option>
                  <option>UN</option>
                  <option>KG</option>
                  <option>L</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">
                  Foto do Material
                </label>
                <div className="mt-1 flex items-center gap-3">
                  {imagemPreview ? (
                    <div className="relative">
                      <img
                        src={imagemPreview}
                        alt="preview"
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <button
                        onClick={() => {
                          setImagemPreview(null);
                          setImagemFile(null);
                          setForm({ ...form, imagem_url: null });
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-700 border border-gray-600 flex items-center justify-center">
                      <Image size={20} className="text-gray-500" />
                    </div>
                  )}
                  <label className="cursor-pointer px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg border border-gray-600 text-sm transition-colors">
                    {imagemPreview ? "Trocar foto" : "Adicionar foto"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImagemChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(false)}
                className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={uploading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Salvando...
                  </>
                ) : editando ? (
                  "Salvar Alterações"
                ) : (
                  "Cadastrar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal visualizar imagem */}
      {modalImagem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setModalImagem(null)}
        >
          <div
            className="relative max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalImagem(null)}
              className="absolute -top-3 -right-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full p-1.5 z-10"
            >
              <X size={18} />
            </button>
            <img
              src={modalImagem.imagem_url}
              alt={modalImagem.descricao}
              className="w-full rounded-xl object-contain max-h-[80vh]"
            />
            <p className="text-center text-gray-300 mt-3 font-medium">
              {modalImagem.descricao}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
