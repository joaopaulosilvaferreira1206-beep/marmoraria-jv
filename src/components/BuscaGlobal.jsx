import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Users,
  Package,
  ShoppingCart,
  FileText,
  Truck,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useBusca } from "../lib/buscaContext";

export default function BuscaGlobal({ aberta, onFechar }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState({
    clientes: [],
    materiais: [],
    fornecedores: [],
    vendas: [],
    orcamentos: [],
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { destacar } = useBusca();

  useEffect(() => {
    if (aberta) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setResultados({
        clientes: [],
        materiais: [],
        fornecedores: [],
        vendas: [],
        orcamentos: [],
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [aberta]);

  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResultados({
        clientes: [],
        materiais: [],
        fornecedores: [],
        vendas: [],
        orcamentos: [],
      });
      return;
    }
    // eslint-disable-next-line react-hooks/immutability
    const timer = setTimeout(() => buscar(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function buscar(termo) {
    setLoading(true);

    // Busca em duas etapas por tabela: primeiro startsWith, depois contains para completar até 4
    async function buscarComRelevancia(tabela, campo, select) {
      const [{ data: starts }, { data: contains }] = await Promise.all([
        supabase.from(tabela).select(select).ilike(campo, `${termo}%`).limit(4),
        supabase.from(tabela).select(select).ilike(campo, `%${termo}%`).not(campo, "ilike", `${termo}%`).limit(4),
      ]);
      const vistos = new Set();
      const merged = [];
      for (const r of [...(starts || []), ...(contains || [])]) {
        if (!vistos.has(r.id)) { vistos.add(r.id); merged.push(r); }
        if (merged.length === 4) break;
      }
      return merged;
    }

    const termoLower = termo.toLowerCase();

    const [clientes, materiais, fornecedores, { data: vendas }, { data: orcamentos }] =
      await Promise.all([
        buscarComRelevancia("clientes", "nome", "id, nome, telefone"),
        buscarComRelevancia("materiais", "descricao", "id, descricao, sku, saldo"),
        buscarComRelevancia("fornecedores", "nome", "id, nome, telefone"),
        supabase.from("vendas").select("id, data, valor_total, clientes(nome)").limit(20),
        supabase.from("orcamentos").select("id, data, valor_total, status, clientes(nome)").limit(20),
      ]);

    setResultados({
      clientes,
      materiais,
      fornecedores,
      vendas: (vendas || [])
        .filter((v) => v.clientes?.nome?.toLowerCase().includes(termoLower))
        .slice(0, 4),
      orcamentos: (orcamentos || [])
        .filter((o) => o.clientes?.nome?.toLowerCase().includes(termoLower))
        .slice(0, 4),
    });
    setLoading(false);
  }

  function navegar(path, tabela, id) {
    destacar(tabela, id);
    navigate(path);
    onFechar();
  }

  const temResultados = Object.values(resultados).some((arr) => arr.length > 0);

  if (!aberta) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center pt-16 px-4"
      onClick={onFechar}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar clientes, materiais, vendas..."
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none text-sm"
          />
          {loading && (
            <span className="text-xs text-gray-500">Buscando...</span>
          )}
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {query.trim() && (
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-700/50">
            {!temResultados && !loading && (
              <p className="text-center text-gray-500 text-sm py-8">
                Nenhum resultado encontrado.
              </p>
            )}

            {resultados.clientes.length > 0 && (
              <Secao titulo="Clientes" icone={Users} cor="text-blue-400">
                {resultados.clientes.map((c) => (
                  <ItemResultado
                    key={c.id}
                    onClick={() => navegar("/clientes", "clientes", c.id)}
                  >
                    <span className="text-gray-200 text-sm font-medium">
                      {c.nome}
                    </span>
                    {c.telefone && (
                      <span className="text-gray-500 text-xs">
                        {c.telefone}
                      </span>
                    )}
                  </ItemResultado>
                ))}
              </Secao>
            )}

            {resultados.materiais.length > 0 && (
              <Secao titulo="Materiais" icone={Package} cor="text-green-400">
                {resultados.materiais.map((m) => (
                  <ItemResultado
                    key={m.id}
                    onClick={() => navegar("/estoque", "materiais", m.id)}
                  >
                    <span className="text-gray-200 text-sm font-medium">
                      {m.descricao}
                    </span>
                    <span className="text-gray-500 text-xs">
                      SKU: {m.sku || "—"} · Saldo: {m.saldo} m²
                    </span>
                  </ItemResultado>
                ))}
              </Secao>
            )}

            {resultados.fornecedores.length > 0 && (
              <Secao titulo="Fornecedores" icone={Truck} cor="text-yellow-400">
                {resultados.fornecedores.map((f) => (
                  <ItemResultado
                    key={f.id}
                    onClick={() =>
                      navegar("/fornecedores", "fornecedores", f.id)
                    }
                  >
                    <span className="text-gray-200 text-sm font-medium">
                      {f.nome}
                    </span>
                    {f.telefone && (
                      <span className="text-gray-500 text-xs">
                        {f.telefone}
                      </span>
                    )}
                  </ItemResultado>
                ))}
              </Secao>
            )}

            {resultados.vendas.length > 0 && (
              <Secao titulo="Vendas" icone={ShoppingCart} cor="text-purple-400">
                {resultados.vendas.map((v) => (
                  <ItemResultado
                    key={v.id}
                    onClick={() => navegar("/vendas", "vendas", v.id)}
                  >
                    <span className="text-gray-200 text-sm font-medium">
                      {v.clientes?.nome}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(v.data).toLocaleDateString("pt-BR")} · R${" "}
                      {(v.valor_total || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </ItemResultado>
                ))}
              </Secao>
            )}

            {resultados.orcamentos.length > 0 && (
              <Secao titulo="Orçamentos" icone={FileText} cor="text-orange-400">
                {resultados.orcamentos.map((o) => (
                  <ItemResultado
                    key={o.id}
                    onClick={() => navegar("/orcamentos", "orcamentos", o.id)}
                  >
                    <span className="text-gray-200 text-sm font-medium">
                      {o.clientes?.nome}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(o.data).toLocaleDateString("pt-BR")} · R${" "}
                      {(o.valor_total || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      · {o.status}
                    </span>
                  </ItemResultado>
                ))}
              </Secao>
            )}
          </div>
        )}

        {!query.trim() && (
          <p className="text-center text-gray-600 text-xs py-6">
            Digite para pesquisar em todo o sistema
          </p>
        )}
      </div>
    </div>
  );
}

function Secao({ titulo, icone: Icon, cor, children }) {
  return (
    <div className="p-3">
      <div className={`flex items-center gap-2 mb-2 ${cor}`}>
        <Icon size={14} />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {titulo}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ItemResultado({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex flex-col gap-0.5 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
    >
      {children}
    </button>
  );
}
