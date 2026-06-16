import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

const DROP_HEIGHT = 220;

export default function SelectBusca({
  opcoes = [],
  valor,
  onChange,
  placeholder = "Selecione...",
  campoLabel = "nome",
  campoValor = "id",
  campoSecundario = null,
  manterAberto = false,
  onToggle = null,
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [posicao, setPosicao] = useState({ top: 0, left: 0, width: 0, acima: false });
  const ref = useRef(null);
  const inputRef = useRef(null);

  const opcaoSelecionada = opcoes.find((o) => o[campoValor] === valor);

  const opcoesFiltradas = opcoes.filter((o) => {
    const termo = busca.toLowerCase();
    const labelMatch = String(o[campoLabel] || "").toLowerCase().includes(termo);
    const secundarioMatch = campoSecundario
      ? String(o[campoSecundario] || "").toLowerCase().includes(termo)
      : false;
    return labelMatch || secundarioMatch;
  });

  function atualizarPosicao() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vv = window.visualViewport;
    const vvHeight = vv?.height ?? window.innerHeight;
    const vvOffsetTop = vv?.offsetTop ?? 0;
    const keyboardOpen = vv && vvHeight < window.innerHeight * 0.75;

    if (keyboardOpen) {
      // Flutua fixo acima do teclado
      setPosicao({
        top: vvOffsetTop + vvHeight - DROP_HEIGHT - 8,
        left: rect.left,
        width: rect.width,
      });
      return;
    }

    const spaceBelow = vvHeight - rect.bottom - 8;
    const acima = spaceBelow < DROP_HEIGHT && rect.top > DROP_HEIGHT;
    setPosicao({
      top: acima ? rect.top - DROP_HEIGHT - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }

  function abrirFechar(novoEstado) {
    setAberto(novoEstado);
    if (onToggle) onToggle(novoEstado);
  }

  useEffect(() => {
    function handleClickFora(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setAberto(false);
        setBusca("");
        if (onToggle) onToggle(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [onToggle]);

  useEffect(() => {
    if (!aberto) return;

    atualizarPosicao();
    if (inputRef.current) inputRef.current.focus();

    // Recalcular quando teclado virtual abre/fecha
    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", atualizarPosicao);

    if (manterAberto) {
      const el = document.querySelector("main");
      if (el) el.style.overflow = "hidden";
      return () => {
        if (el) el.style.overflow = "";
        if (vv) vv.removeEventListener("resize", atualizarPosicao);
      };
    }

    let rafId;
    function loop() {
      atualizarPosicao();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    function handleScroll(e) {
      if (ref.current && ref.current.contains(e.target)) return;
      setAberto(false);
      setBusca("");
      if (onToggle) onToggle(false);
    }
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll, true);
      if (vv) vv.removeEventListener("resize", atualizarPosicao);
    };
  }, [aberto, manterAberto, onToggle]);

  function selecionar(opcao) {
    onChange(opcao[campoValor]);
    setAberto(false);
    setBusca("");
    if (onToggle) onToggle(false);
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => abrirFechar(!aberto)}
        className="w-full flex items-center justify-between bg-gray-700 border border-gray-600 text-left rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
      >
        <span className={opcaoSelecionada ? "text-gray-100" : "text-gray-500"}>
          {/* eslint-disable-next-line no-nested-ternary */}
          {opcaoSelecionada
            ? campoSecundario
              ? `[${opcaoSelecionada[campoSecundario]}] ${opcaoSelecionada[campoLabel]}`
              : opcaoSelecionada[campoLabel]
            : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div
          className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-xl"
          style={{
            top: posicao.top,
            left: posicao.left,
            width: posicao.width,
            maxHeight: `${DROP_HEIGHT}px`,
          }}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 bg-transparent text-gray-100 text-sm focus:outline-none placeholder-gray-500"
            />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: `${DROP_HEIGHT - 48}px` }}>
            {opcoesFiltradas.length === 0 ? (
              <div className="px-3 py-3 text-gray-500 text-sm text-center">
                Nenhum resultado encontrado
              </div>
            ) : (
              opcoesFiltradas.map((opcao) => (
                <button
                  key={opcao[campoValor]}
                  type="button"
                  onClick={() => selecionar(opcao)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-700 ${
                    opcao[campoValor] === valor
                      ? "bg-blue-600/20 text-blue-300"
                      : "text-gray-200"
                  }`}
                >
                  {campoSecundario && (
                    <span className="text-gray-400 font-mono mr-2">
                      [{opcao[campoSecundario]}]
                    </span>
                  )}
                  {opcao[campoLabel]}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
