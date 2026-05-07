import { useLocation } from "react-router-dom";
import { Menu, Download, Search } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "/icon-192.png";
import BuscaGlobal from "./BuscaGlobal";

const titulos = {
  "/": "Dashboard",
  "/estoque": "Estoque",
  "/entradas": "Entradas",
  "/vendas": "Vendas",
  "/perdas": "Perdas",
  "/clientes": "Clientes",
  "/fornecedores": "Fornecedores",
  "/pedidos": "Pedidos",
  "/orcamentos": "Orçamentos",
  "/relatorios": "Relatórios",
  "/backup": "Backup",
  "/usuarios": "Usuários",
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const titulo = titulos[location.pathname] || "Marmoraria JV";
  const [promptInstalacao, setPromptInstalacao] = useState(null);
  const [podeInstalar, setPodeInstalar] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPromptInstalacao(e);
      setPodeInstalar(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Atalho de teclado: Ctrl+K ou Cmd+K
  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setBuscaAberta(true);
      }
      if (e.key === "Escape") setBuscaAberta(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  async function instalar() {
    if (!promptInstalacao) return;
    promptInstalacao.prompt();
    const { outcome } = await promptInstalacao.userChoice;
    if (outcome === "accepted") {
      setPodeInstalar(false);
      setPromptInstalacao(null);
    }
  }

  return (
    <>
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
          >
            <Menu size={24} />
          </button>
          <h2 className="text-xl font-semibold text-white">{titulo}</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão de busca */}
          <button
            onClick={() => setBuscaAberta(true)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg transition-colors border border-gray-600"
          >
            <Search size={15} />
            <span className="hidden sm:inline text-xs">Buscar</span>
            <span className="hidden md:inline text-xs text-gray-500 border border-gray-600 rounded px-1">
              Ctrl K
            </span>
          </button>

          {podeInstalar && (
            <button
              onClick={instalar}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-200">Marmoraria JV</p>
            <p className="text-xs text-gray-400">Gestão de Estoque</p>
          </div>
          <div className="w-9 h-9 rounded-full overflow-hidden">
            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      <BuscaGlobal
        aberta={buscaAberta}
        onFechar={() => setBuscaAberta(false)}
      />
    </>
  );
}
