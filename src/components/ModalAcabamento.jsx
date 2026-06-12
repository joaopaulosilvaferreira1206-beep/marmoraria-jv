import { X } from "lucide-react";

const ACABAMENTOS = [
  {
    nome: "Simples",
    svg: (
      <svg viewBox="0 0 60 30" fill="none">
        <rect x="5" y="10" width="50" height="10" rx="1" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Simples Duplo",
    svg: (
      <svg viewBox="0 0 60 40" fill="none">
        <rect x="5" y="6" width="50" height="8" rx="1" fill="#ef4444" />
        <rect x="5" y="18" width="50" height="8" rx="1" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Sanduíche",
    svg: (
      <svg viewBox="0 0 60 40" fill="none">
        <rect x="5" y="4" width="50" height="7" rx="1" fill="#ef4444" />
        <rect x="5" y="14" width="50" height="7" rx="1" fill="#ef4444" />
        <rect x="5" y="24" width="50" height="7" rx="1" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Bisotê",
    svg: (
      <svg viewBox="0 0 60 30" fill="none">
        <polygon points="5,20 55,20 55,10 15,10" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Chanfrado Simples",
    svg: (
      <svg viewBox="0 0 60 30" fill="none">
        <polygon points="5,22 55,22 55,10 20,10" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Chanfrado Invertido",
    svg: (
      <svg viewBox="0 0 60 30" fill="none">
        <polygon points="5,10 55,10 40,22 5,22" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Boleado",
    svg: (
      <svg viewBox="0 0 60 30" fill="none">
        <rect x="5" y="12" width="42" height="10" rx="1" fill="#ef4444" />
        <ellipse cx="47" cy="12" rx="8" ry="10" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Boleado Duplo",
    svg: (
      <svg viewBox="0 0 60 40" fill="none">
        <rect x="5" y="6" width="38" height="8" rx="1" fill="#ef4444" />
        <ellipse cx="43" cy="6" rx="7" ry="8" fill="#ef4444" />
        <rect x="5" y="22" width="38" height="8" rx="1" fill="#ef4444" />
        <ellipse cx="43" cy="22" rx="7" ry="8" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Boleado Triplo",
    svg: (
      <svg viewBox="0 0 60 50" fill="none">
        <rect x="5" y="4" width="36" height="7" rx="1" fill="#ef4444" />
        <ellipse cx="41" cy="4" rx="6" ry="7" fill="#ef4444" />
        <rect x="5" y="16" width="36" height="7" rx="1" fill="#ef4444" />
        <ellipse cx="41" cy="16" rx="6" ry="7" fill="#ef4444" />
        <rect x="5" y="28" width="36" height="7" rx="1" fill="#ef4444" />
        <ellipse cx="41" cy="28" rx="6" ry="7" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "½ Cana",
    svg: (
      <svg viewBox="0 0 60 30" fill="none">
        <rect x="5" y="12" width="50" height="10" rx="1" fill="#ef4444" />
        <ellipse cx="30" cy="12" rx="25" ry="6" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "½ Cana Dupla",
    svg: (
      <svg viewBox="0 0 60 40" fill="none">
        <rect x="5" y="8" width="50" height="8" rx="1" fill="#ef4444" />
        <ellipse cx="30" cy="8" rx="25" ry="5" fill="#ef4444" />
        <rect x="5" y="22" width="50" height="8" rx="1" fill="#ef4444" />
        <ellipse cx="30" cy="22" rx="25" ry="5" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "½ Cana Invertido",
    svg: (
      <svg viewBox="0 0 60 30" fill="none">
        <rect x="5" y="10" width="50" height="10" rx="1" fill="#ef4444" />
        <ellipse cx="30" cy="20" rx="25" ry="6" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "½ Cana c/ Friso",
    svg: (
      <svg viewBox="0 0 60 35" fill="none">
        <rect x="5" y="10" width="50" height="10" rx="1" fill="#ef4444" />
        <ellipse cx="30" cy="10" rx="25" ry="6" fill="#ef4444" />
        <rect x="5" y="24" width="50" height="4" rx="1" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "½ Cana c/ Boleado",
    svg: (
      <svg viewBox="0 0 60 35" fill="none">
        <rect x="5" y="10" width="42" height="10" rx="1" fill="#ef4444" />
        <ellipse cx="30" cy="10" rx="25" ry="6" fill="#ef4444" />
        <ellipse cx="47" cy="20" rx="8" ry="8" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Boleado c/ Rebaixo",
    svg: (
      <svg viewBox="0 0 60 35" fill="none">
        <rect x="5" y="8" width="42" height="10" rx="1" fill="#ef4444" />
        <ellipse cx="47" cy="8" rx="8" ry="10" fill="#ef4444" />
        <rect x="5" y="22" width="30" height="6" rx="1" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Boleado Duplo c/ Div.",
    svg: (
      <svg viewBox="0 0 60 40" fill="none">
        <rect x="5" y="5" width="36" height="8" rx="1" fill="#ef4444" />
        <ellipse cx="41" cy="9" rx="7" ry="8" fill="#ef4444" />
        <rect x="5" y="18" width="36" height="8" rx="1" fill="#ef4444" />
        <ellipse cx="41" cy="22" rx="7" ry="8" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Boleado Triplo c/ Div.",
    svg: (
      <svg viewBox="0 0 60 50" fill="none">
        <rect x="5" y="4" width="34" height="7" rx="1" fill="#ef4444" />
        <ellipse cx="39" cy="7" rx="6" ry="7" fill="#ef4444" />
        <rect x="5" y="16" width="34" height="7" rx="1" fill="#ef4444" />
        <ellipse cx="39" cy="19" rx="6" ry="7" fill="#ef4444" />
        <rect x="5" y="28" width="34" height="7" rx="1" fill="#ef4444" />
        <ellipse cx="39" cy="31" rx="6" ry="7" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Sanduíche Recuado",
    svg: (
      <svg viewBox="0 0 60 40" fill="none">
        <rect x="5" y="4" width="50" height="7" rx="1" fill="#ef4444" />
        <rect x="12" y="14" width="36" height="7" rx="1" fill="#ef4444" />
        <rect x="5" y="24" width="50" height="7" rx="1" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "45°",
    svg: (
      <svg viewBox="0 0 60 40" fill="none">
        <polygon points="5,35 55,35 55,10 40,35" fill="#ef4444" />
        <polygon points="5,10 5,35 40,35" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "½ Cana Duplo",
    svg: (
      <svg viewBox="0 0 60 40" fill="none">
        <rect x="5" y="10" width="50" height="8" rx="1" fill="#ef4444" />
        <ellipse cx="30" cy="10" rx="25" ry="5" fill="#ef4444" />
        <rect x="5" y="24" width="50" height="8" rx="1" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "½ Cana Triplo",
    svg: (
      <svg viewBox="0 0 60 50" fill="none">
        <rect x="5" y="8" width="50" height="7" rx="1" fill="#ef4444" />
        <ellipse cx="30" cy="8" rx="25" ry="5" fill="#ef4444" />
        <rect x="5" y="20" width="50" height="7" rx="1" fill="#ef4444" />
        <ellipse cx="30" cy="20" rx="25" ry="5" fill="#ef4444" />
        <rect x="5" y="32" width="50" height="7" rx="1" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Chanfro Duplo",
    svg: (
      <svg viewBox="0 0 60 40" fill="none">
        <polygon points="5,18 55,18 45,8 5,8" fill="#ef4444" />
        <polygon points="5,22 55,22 55,32 15,32" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Rebaixo",
    svg: (
      <svg viewBox="0 0 60 35" fill="none">
        <rect x="5" y="8" width="50" height="10" rx="1" fill="#ef4444" />
        <rect x="5" y="22" width="30" height="6" rx="1" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Rebaixo Invertido",
    svg: (
      <svg viewBox="0 0 60 35" fill="none">
        <rect x="5" y="8" width="50" height="10" rx="1" fill="#ef4444" />
        <rect x="25" y="22" width="30" height="6" rx="1" fill="#ef4444" />
      </svg>
    ),
  },
  {
    nome: "Espelho ½",
    svg: (
      <svg viewBox="0 0 60 40" fill="none">
        <rect x="5" y="8" width="50" height="10" rx="1" fill="#ef4444" />
        <ellipse cx="30" cy="8" rx="25" ry="6" fill="#ef4444" />
        <rect x="5" y="26" width="20" height="6" rx="1" fill="#ef4444" />
      </svg>
    ),
  },
];

export default function ModalAcabamento({ aberto, onFechar, onSelecionar }) {
  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-[70] flex items-center justify-center p-4"
      onClick={onFechar}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
          <div>
            <h3 className="text-gray-100 font-semibold text-lg">
              Tipo de Acabamento
            </h3>
            <p className="text-gray-400 text-xs mt-0.5">
              Selecione o acabamento desejado
            </p>
          </div>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-5">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {ACABAMENTOS.map((a) => (
              <button
                key={a.nome}
                onClick={() => {
                  onSelecionar(a.nome);
                  onFechar();
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-700 hover:bg-gray-600 hover:ring-2 hover:ring-blue-500 transition-all group"
              >
                <div className="w-full h-12 flex items-center justify-center">
                  <div className="w-14 h-10">{a.svg}</div>
                </div>
                <span className="text-gray-300 text-xs text-center leading-tight group-hover:text-white transition-colors">
                  {a.nome}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
