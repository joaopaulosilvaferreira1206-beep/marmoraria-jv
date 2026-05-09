import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, Eye } from "lucide-react";

async function interpretarGeometriaIA(tipoTrabalho, descricaoMaterial) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interpretar-geometria`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ tipoTrabalho, descricaoMaterial }),
      },
    );
    return await response.json();
  } catch {
    return {
      forma: "placa",
      largura: 2.5,
      altura: 0.08,
      profundidade: 1.8,
      detalhes: "Peça genérica",
    };
  }
}

function gerarTexturaProc(THREE, nomeMaterial) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const nome = (nomeMaterial || "").toLowerCase();

  const flags = {
    branco:
      nome.includes("branco") ||
      nome.includes("white") ||
      nome.includes("neve") ||
      nome.includes("polar"),
    preto:
      nome.includes("preto") ||
      nome.includes("black") ||
      nome.includes("negro") ||
      nome.includes("absolute"),
    cinza:
      nome.includes("cinza") ||
      nome.includes("grey") ||
      nome.includes("gray") ||
      nome.includes("prata") ||
      nome.includes("silver"),
    verde:
      nome.includes("verde") ||
      nome.includes("green") ||
      nome.includes("ubatuba") ||
      nome.includes("labrador"),
    azul:
      nome.includes("azul") || nome.includes("blue") || nome.includes("bahia"),
    roxo:
      nome.includes("roxo") ||
      nome.includes("lilas") ||
      nome.includes("violeta") ||
      nome.includes("purple"),
    ocre:
      nome.includes("ocre") ||
      nome.includes("gold") ||
      nome.includes("dourado") ||
      nome.includes("amarelo") ||
      nome.includes("mel"),
    marfim:
      nome.includes("marfim") ||
      nome.includes("bege") ||
      nome.includes("creme") ||
      nome.includes("champagne"),
    rosa:
      nome.includes("rosa") ||
      nome.includes("pink") ||
      nome.includes("salmon") ||
      nome.includes("coral"),
    vermelho:
      nome.includes("vermelho") ||
      nome.includes("red") ||
      nome.includes("rubi") ||
      nome.includes("bordeaux"),
    cobre:
      nome.includes("cobre") ||
      nome.includes("copper") ||
      nome.includes("bronze") ||
      nome.includes("ferrugem"),
    marmore:
      nome.includes("mármore") ||
      nome.includes("marmore") ||
      nome.includes("marble"),
    granito: nome.includes("granito") || nome.includes("granite"),
    quartzito:
      nome.includes("quartzito") ||
      nome.includes("quartzite") ||
      nome.includes("quartz"),
    travertino: nome.includes("travertino"),
    onix:
      nome.includes("ônix") || nome.includes("onix") || nome.includes("onyx"),
  };

  const paletas = {
    branco: { f: "#f5f0eb", b: "#faf7f4", v1: "#e8e0d8", v2: "#d0c8c0" },
    preto: { f: "#0d0d0d", b: "#1a1a1a", v1: "#252525", v2: "#333333" },
    cinza: { f: "#4a4a4a", b: "#606060", v1: "#808080", v2: "#a0a0a0" },
    verde: { f: "#1e3a28", b: "#2d5038", v1: "#3d6848", v2: "#8ab890" },
    azul: { f: "#1a2d4a", b: "#243860", v1: "#3a5280", v2: "#90b0d8" },
    roxo: { f: "#2e1848", b: "#3d225e", v1: "#5a3280", v2: "#c0a0e8" },
    ocre: { f: "#7a5a18", b: "#9a7228", v1: "#c89838", v2: "#e8c860" },
    marfim: { f: "#d8cdb8", b: "#e8ddc8", v1: "#c8bda8", v2: "#b8ad98" },
    rosa: { f: "#b06070", b: "#c87888", v1: "#d898a0", v2: "#f0c0c8" },
    vermelho: { f: "#6a1018", b: "#8a1828", v1: "#aa2838", v2: "#d05060" },
    cobre: { f: "#6a3010", b: "#8a4820", v1: "#b06030", v2: "#d88050" },
  };

  const coresAtivas = Object.keys(paletas).filter((k) => flags[k]);
  let paleta;
  if (coresAtivas.length === 0) {
    paleta = { f: "#6a5848", b: "#7a6858", v1: "#9a8878", v2: "#b8a898" };
  } else if (coresAtivas.length === 1) {
    paleta = paletas[coresAtivas[0]];
  } else {
    const p1 = paletas[coresAtivas[0]];
    const p2 = paletas[coresAtivas[1]];
    paleta = {
      f: misturarCores(p1.f, p2.f, 0.6),
      b: misturarCores(p1.b, p2.b, 0.6),
      v1: misturarCores(p1.v1, p2.v1, 0.5),
      v2: misturarCores(p1.v2, p2.v2, 0.4),
    };
  }

  ctx.fillStyle = paleta.f;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? paleta.v1 : paleta.b;
    ctx.globalAlpha = 0.05 + Math.random() * 0.15;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (flags.granito) {
    for (let i = 0; i < 700; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 1 + Math.random() * 4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = [paleta.v1, paleta.v2, paleta.b, "#ffffff55"][
        Math.floor(Math.random() * 4)
      ];
      ctx.globalAlpha = 0.35 + Math.random() * 0.45;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (flags.marmore || flags.onix || flags.quartzito) {
    for (let v = 0; v < 10; v++) {
      ctx.beginPath();
      let cx = Math.random() * 512;
      let cy = Math.random() * 512;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 14; s++) {
        cx += (Math.random() - 0.4) * 55;
        cy += (Math.random() - 0.3) * 45;
        const cpx = cx + (Math.random() - 0.5) * 35;
        const cpy = cy + (Math.random() - 0.5) * 35;
        ctx.quadraticCurveTo(cpx, cpy, cx, cy);
      }
      ctx.strokeStyle = v % 2 === 0 ? paleta.v1 : paleta.v2;
      ctx.lineWidth = 0.5 + Math.random() * 2.5;
      ctx.globalAlpha = 0.25 + Math.random() * 0.45;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (flags.travertino) {
    for (let ly = 0; ly < 512; ly += 8 + Math.random() * 14) {
      ctx.beginPath();
      ctx.moveTo(0, ly);
      for (let lx = 0; lx < 512; lx += 20) {
        ctx.lineTo(lx, ly + (Math.random() - 0.5) * 5);
      }
      ctx.strokeStyle = paleta.v1;
      ctx.lineWidth = 1 + Math.random() * 3;
      ctx.globalAlpha = 0.2 + Math.random() * 0.3;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    for (let v = 0; v < 5; v++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.bezierCurveTo(
        Math.random() * 512,
        Math.random() * 512,
        Math.random() * 512,
        Math.random() * 512,
        Math.random() * 512,
        Math.random() * 512,
      );
      ctx.strokeStyle = paleta.v1;
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.globalAlpha = 0.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const grad = ctx.createRadialGradient(180, 150, 10, 200, 200, 350);
  grad.addColorStop(0, "rgba(255,255,255,0.12)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function misturarCores(hex1, hex2, peso) {
  const p = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = p(hex1);
  const [r2, g2, b2] = p(hex2);
  const r = Math.round(r1 * peso + r2 * (1 - peso));
  const g = Math.round(g1 * peso + g2 * (1 - peso));
  const b = Math.round(b1 * peso + b2 * (1 - peso));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function criarGeometriaIA(THREE, params) {
  const group = new THREE.Group();
  const { forma, largura = 2.5, altura = 0.08, profundidade = 1.8 } = params;

  switch (forma) {
    case "espelho": {
      const molduraGeo = new THREE.BoxGeometry(
        largura + 0.15,
        profundidade + 0.15,
        0.06,
      );
      const molduraMat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.2,
        metalness: 0.7,
      });
      const moldura = new THREE.Mesh(molduraGeo, molduraMat);
      moldura.position.set(0, profundidade / 2 + 0.5, 0);
      group.add(moldura);
      const placaGeo = new THREE.BoxGeometry(largura, profundidade, 0.04);
      const placa = new THREE.Mesh(placaGeo, null);
      placa.position.set(0, profundidade / 2 + 0.5, 0.02);
      group.add(placa);
      group._mainMesh = placa;
      break;
    }
    case "coluna":
    case "pilar": {
      const colunaGeo = new THREE.CylinderGeometry(
        largura / 6,
        largura / 5,
        profundidade * 1.5,
        16,
      );
      const coluna = new THREE.Mesh(colunaGeo, null);
      coluna.position.y = profundidade * 0.75;
      group.add(coluna);
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(largura / 3, 0.1, largura / 3),
        null,
      );
      base.position.y = 0.05;
      group.add(base);
      group._mainMesh = coluna;
      break;
    }
    case "vaso": {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push(
          new THREE.Vector2(
            0.2 + Math.sin(t * Math.PI) * (largura / 5),
            t * profundidade,
          ),
        );
      }
      const vaso = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), null);
      group.add(vaso);
      group._mainMesh = vaso;
      break;
    }
    case "escada": {
      for (let i = 0; i < 5; i++) {
        const degrau = new THREE.Mesh(
          new THREE.BoxGeometry(largura, altura * 1.5, profundidade / 5),
          null,
        );
        degrau.position.set(
          0,
          i * (altura * 1.5) + altura * 0.75,
          -i * (profundidade / 5) + profundidade / 2,
        );
        group.add(degrau);
        if (i === 0) group._mainMesh = degrau;
      }
      break;
    }
    case "pia": {
      const tampo = new THREE.Mesh(
        new THREE.BoxGeometry(largura, altura, profundidade),
        null,
      );
      tampo.position.y = 0.85;
      group.add(tampo);
      const cuba = new THREE.Mesh(
        new THREE.BoxGeometry(largura * 0.35, altura * 4, profundidade * 0.4),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3 }),
      );
      cuba.position.set(0, 0.7, 0);
      group.add(cuba);
      group._mainMesh = tampo;
      break;
    }
    case "bancada": {
      const tampo = new THREE.Mesh(
        new THREE.BoxGeometry(largura, altura, profundidade),
        null,
      );
      tampo.position.y = 0.85;
      group.add(tampo);
      const frente = new THREE.Mesh(
        new THREE.BoxGeometry(largura, altura * 1.5, 0.04),
        null,
      );
      frente.position.set(0, 0.78, profundidade / 2 + 0.02);
      group.add(frente);
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(largura, 0.75, profundidade - 0.05),
        new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 }),
      );
      base.position.y = 0.38;
      group.add(base);
      group._mainMesh = tampo;
      group._extraMesh = frente;
      break;
    }
    case "mesa": {
      const tampa = new THREE.Mesh(
        new THREE.BoxGeometry(largura, altura, profundidade),
        null,
      );
      tampa.position.y = 0.8;
      group.add(tampa);
      const peGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.75, 12);
      const peMat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.3,
        metalness: 0.6,
      });
      const offX = largura / 2 - 0.2,
        offZ = profundidade / 2 - 0.15;
      [
        [-offX, 0.37, -offZ],
        [offX, 0.37, -offZ],
        [-offX, 0.37, offZ],
        [offX, 0.37, offZ],
      ].forEach(([x, y, z]) => {
        const pe = new THREE.Mesh(peGeo, peMat);
        pe.position.set(x, y, z);
        group.add(pe);
      });
      group._mainMesh = tampa;
      break;
    }
    case "janela":
    case "painel": {
      const moldura = new THREE.Mesh(
        new THREE.BoxGeometry(largura + 0.1, profundidade + 0.1, 0.08),
        null,
      );
      moldura.position.set(0, profundidade / 2 + 0.3, 0);
      group.add(moldura);
      group._mainMesh = moldura;
      break;
    }
    case "soleira":
    case "peitoril": {
      const sol = new THREE.Mesh(
        new THREE.BoxGeometry(largura, altura, profundidade),
        null,
      );
      sol.position.y = altura / 2;
      group.add(sol);
      group._mainMesh = sol;
      break;
    }
    default: {
      const placa = new THREE.Mesh(
        new THREE.BoxGeometry(largura, altura, profundidade),
        null,
      );
      placa.position.y = altura / 2;
      group.add(placa);
      group._mainMesh = placa;
      break;
    }
  }
  return group;
}

export function Visualizador3D({ item, onFechar }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [carregando, setCarregando] = useState(true);
  const [statusIA, setStatusIA] = useState("Consultando IA...");
  const zoomRef = useRef(5);
  const [detalhesIA, setDetalhesIA] = useState("");

  useEffect(() => {
    let animId;

    async function init() {
      setCarregando(true);
      setStatusIA("Consultando IA para gerar geometria...");

      const params = await interpretarGeometriaIA(
        item.tipo_trabalho || "placa",
        item.descricao || "",
      );
      setDetalhesIA(params.detalhes || "");
      setStatusIA("Renderizando modelo 3D...");

      const THREE = await import("three");
      const canvas = canvasRef.current;
      if (!canvas) return;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1f2e);

      const camera = new THREE.PerspectiveCamera(
        45,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        100,
      );

      scene.add(new THREE.AmbientLight(0x6080c0, 0.8));

      const dirLight = new THREE.DirectionalLight(0xfff5e0, 1.5);
      dirLight.position.set(5, 8, 5);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const fillLight = new THREE.DirectionalLight(0x4060ff, 0.4);
      fillLight.position.set(-4, 2, -4);
      scene.add(fillLight);

      const rimLight = new THREE.PointLight(0x80a0ff, 0.5, 15);
      rimLight.position.set(-3, 4, -2);
      scene.add(rimLight);

      scene.add(new THREE.GridHelper(10, 20, 0x334466, 0x223355));

      const grupo = criarGeometriaIA(THREE, params);

      let textura;
      if (item.imagem_url) {
        const loader = new THREE.TextureLoader();
        textura = await new Promise((res) => {
          loader.load(
            item.imagem_url,
            (t) => {
              t.wrapS = t.wrapT = THREE.RepeatWrapping;
              t.repeat.set(2, 2);
              res(t);
            },
            undefined,
            () => res(gerarTexturaProc(THREE, item.descricao)),
          );
        });
      } else {
        textura = gerarTexturaProc(THREE, item.descricao);
      }

      const materialPedra = new THREE.MeshStandardMaterial({
        map: textura,
        roughness: params.forma === "espelho" ? 0.05 : 0.25,
        metalness: params.forma === "espelho" ? 0.9 : 0.05,
      });

      grupo.traverse((obj) => {
        if (obj.isMesh && obj.material === null) obj.material = materialPedra;
      });
      if (grupo._extraMesh?.material === null)
        grupo._extraMesh.material = materialPedra;

      // Centraliza a peça na origem
      const box = new THREE.Box3().setFromObject(grupo);
      const center = new THREE.Vector3();
      box.getCenter(center);
      grupo.position.sub(center);

      scene.add(grupo);
      sceneRef.current = { scene, camera, renderer, grupo };
      setCarregando(false);

      let isDragging = false;
      let lastX = 0;
      let lastY = 0;
      let rotY = 0;
      let rotX = 0.4;

      canvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      });
      canvas.addEventListener("mouseup", () => {
        isDragging = false;
      });
      canvas.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        rotY += (e.clientX - lastX) * 0.01;
        rotX += (e.clientY - lastY) * 0.008;
        lastX = e.clientX;
        lastY = e.clientY;
      });

      let lastTouchX = 0;
      let lastTouchY = 0;
      let lastPinchDist = 0;

      canvas.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
          lastTouchX = e.touches[0].clientX;
          lastTouchY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          lastPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
        }
      });

      canvas.addEventListener(
        "touchmove",
        (e) => {
          e.preventDefault();
          if (e.touches.length === 1) {
            rotY += (e.touches[0].clientX - lastTouchX) * 0.01;
            rotX += (e.touches[0].clientY - lastTouchY) * 0.008;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
          } else if (e.touches.length === 2) {
            const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY,
            );
            zoomRef.current = Math.max(
              2,
              Math.min(10, zoomRef.current - (dist - lastPinchDist) * 0.02),
            );
            lastPinchDist = dist;
          }
        },
        { passive: false },
      );

      canvas.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          zoomRef.current = Math.max(
            2,
            Math.min(10, zoomRef.current + e.deltaY * 0.005),
          );
        },
        { passive: false },
      );

      function animate() {
        animId = requestAnimationFrame(animate);
        const isAcabamento =
          (item.tipo_trabalho || "").toLowerCase() === "acabamento";
        if (!isDragging && !isAcabamento) rotY += 0.003;

        // Órbita esférica completa 360°
        const r = zoomRef.current;
        camera.position.x = Math.sin(rotY) * r * Math.cos(rotX);
        camera.position.z = Math.cos(rotY) * r * Math.cos(rotX);
        camera.position.y = r * Math.sin(rotX);
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      }
      animate();
    }

    init();
    return () => {
      cancelAnimationFrame(animId);
      sceneRef.current?.renderer.dispose();
    };
  }, [item]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div>
            <h3 className="text-gray-100 font-semibold text-base">
              Visualização 3D
            </h3>
            <p className="text-gray-400 text-xs mt-0.5">
              <span className="text-blue-400">{item.descricao}</span>
              {item.tipo_trabalho && (
                <span className="ml-2 bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full text-xs">
                  {item.tipo_trabalho}
                </span>
              )}
              {detalhesIA && (
                <span className="ml-2 text-gray-500 text-xs italic">
                  {detalhesIA}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative" style={{ height: 380 }}>
          {carregando && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-400 text-sm">{statusIA}</p>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            style={{ display: "block" }}
          />
        </div>

        <div className="px-5 py-3 border-t border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                zoomRef.current = Math.max(2, zoomRef.current - 1);
              }}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title="Aproximar"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => {
                zoomRef.current = Math.min(10, zoomRef.current + 1);
              }}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title="Afastar"
            >
              <ZoomOut size={16} />
            </button>
          </div>
          <p className="text-gray-500 text-xs">
            {item.imagem_url
              ? "✦ Textura real do material"
              : "✦ Textura gerada por IA"}
          </p>
          <p className="text-gray-600 text-xs">Arraste para girar</p>
        </div>
      </div>
    </div>
  );
}

export function BotaoVisualizar({ item }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1 text-xs bg-purple-900/40 hover:bg-purple-900/70 text-purple-300 px-2 py-0.5 rounded-full transition-colors"
        title="Visualizar peça em 3D"
      >
        <Eye size={11} />
        Ver peça
      </button>
      {aberto && (
        <Visualizador3D item={item} onFechar={() => setAberto(false)} />
      )}
    </>
  );
}
