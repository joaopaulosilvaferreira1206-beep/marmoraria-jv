import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, Eye } from "lucide-react";

// ─── Detecção de categoria (sem IA, 100% local) ────────────────────────────
function detectarCategoria(tipoTrabalho) {
  const t = (tipoTrabalho || "").toLowerCase();
  if (
    t.startsWith("acabamento") ||
    t.includes("boleado") ||
    t.includes("½ cana") || t.includes("1/2 cana") || t.includes("meia cana") ||
    t.includes("bisotê") || t.includes("bisote") ||
    t.includes("chanfra") || t.includes("chanfro") ||
    t.includes("sanduíche") || t.includes("sanduiche") ||
    t.includes("espelho ½") || t.includes("espelho 1/2") ||
    (t.includes("rebaixo") && !t.includes("bancada"))
  ) return "acabamento";
  if (t.includes("cuba") || t.includes("pia") || t.includes("lavatório") || t.includes("lavatorio")) return "pia";
  if (t.includes("bancada") || t.includes("tampo") || t.includes("balcão") || t.includes("balcao")) return "bancada";
  if (t.includes("mesa") || t.includes("tampo de mesa")) return "mesa";
  if (t.includes("escada") || t.includes("degrau")) return "escada";
  if (t.includes("soleira") || t.includes("peitoril")) return "soleira";
  if (t.includes("coluna") || t.includes("pilar")) return "coluna";
  if (t.includes("espelho")) return "espelho";
  if (t.includes("janela") || t.includes("painel") || t.includes("revestimento")) return "painel";
  if (t.includes("vaso") || t.includes("floreira")) return "vaso";
  return "placa";
}

// ─── Dimensões escaladas pela área (quantidade = m²) ───────────────────────
function calcDimensoes(categoria, quantidade) {
  const area = Math.max(0.1, Math.min(Number(quantidade) || 2.0, 30));
  const T = 0.08;
  const ratios = {
    bancada: 2.8, pia: 2.2, mesa: 1.8, escada: 1.6,
    soleira: 6, coluna: 0.5, espelho: 0.65, painel: 0.7,
    vaso: 0.6, placa: 1.5, acabamento: 1,
  };
  const ratio = ratios[categoria] ?? 1.5;
  return {
    L: Math.max(0.6, Math.sqrt(area * ratio)),
    D: Math.max(0.3, Math.sqrt(area / ratio)),
    T,
  };
}

// ─── Configuração de câmera por categoria ─────────────────────────────────
function cameraConfig(categoria) {
  switch (categoria) {
    case "acabamento": return { rotY: Math.PI / 4, rotX: 0.3, zoom: 2.5 };
    case "escada":     return { rotY: 0.9, rotX: 0.4, zoom: 4.5 };
    case "coluna":     return { rotY: 0.4, rotX: 0.15, zoom: 4.5 };
    case "espelho":
    case "painel":     return { rotY: 0.2, rotX: 0.25, zoom: 4.5 };
    case "soleira":    return { rotY: 0.4, rotX: 0.55, zoom: 4 };
    case "vaso":       return { rotY: 0.5, rotX: 0.2, zoom: 4 };
    default:           return { rotY: 0.5, rotX: 0.6, zoom: 4 };
  }
}

// ─── Modelos 3D por categoria ──────────────────────────────────────────────
function criarPeca3D(THREE, categoria, L, D, T) {
  const group = new THREE.Group();

  switch (categoria) {
    case "bancada": {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(L, T, D), null);
      slab.position.y = T / 2;
      group.add(slab);
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(L, T * 1.6, 0.04), null);
      skirt.position.set(0, T * 0.7, D / 2 + 0.02);
      group.add(skirt);
      group._mainMesh = slab;
      group._extraMesh = skirt;
      break;
    }
    case "pia": {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(L, T, D), null);
      slab.position.y = T / 2;
      group.add(slab);
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(L, T * 1.6, 0.04), null);
      skirt.position.set(0, T * 0.7, D / 2 + 0.02);
      group.add(skirt);
      const cuba = new THREE.Mesh(
        new THREE.BoxGeometry(L * 0.38, T * 3.5, D * 0.52),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 }),
      );
      cuba.position.set(0, -T * 1.5, -D * 0.04);
      group.add(cuba);
      const borda = new THREE.Mesh(
        new THREE.BoxGeometry(L * 0.38 + 0.04, T * 0.6, D * 0.52 + 0.04),
        null,
      );
      borda.position.set(0, T / 2, -D * 0.04);
      group.add(borda);
      group._mainMesh = slab;
      group._extraMesh = skirt;
      break;
    }
    case "mesa": {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(L, T, D), null);
      slab.position.y = 0.82;
      group.add(slab);
      const legGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.78, 10);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.3, metalness: 0.7 });
      const ox = L / 2 - 0.14, oz = D / 2 - 0.1;
      [[-ox, -oz], [ox, -oz], [-ox, oz], [ox, oz]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, 0.39, z);
        group.add(leg);
      });
      group._mainMesh = slab;
      break;
    }
    case "escada": {
      const nSteps = 5;
      const stepH = T * 2.8;
      const stepD = D / nSteps;
      for (let i = 0; i < nSteps; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(L, stepH, stepD * (i + 1)), null);
        step.position.set(0, stepH * i + stepH / 2, -(D / 2) + (stepD * (i + 1)) / 2);
        group.add(step);
        if (i === 0) group._mainMesh = step;
      }
      break;
    }
    case "soleira": {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(L, T * 0.75, D), null);
      slab.position.y = T * 0.375;
      group.add(slab);
      group._mainMesh = slab;
      break;
    }
    case "coluna": {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(L / 5.5, L / 4.5, 1.6, 24), null);
      shaft.position.y = 0.9;
      group.add(shaft);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(L / 2.8, 0.09, L / 2.8), null);
      cap.position.y = 1.74;
      group.add(cap);
      const base = new THREE.Mesh(new THREE.BoxGeometry(L / 2.8, 0.09, L / 2.8), null);
      base.position.y = 0.045;
      group.add(base);
      group._mainMesh = shaft;
      break;
    }
    case "espelho": {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(L, D, 0.07), null);
      frame.position.set(0, D / 2 + 0.3, 0);
      group.add(frame);
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(L * 0.84, D * 0.84, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.04, metalness: 0.85 }),
      );
      glass.position.set(0, D / 2 + 0.3, 0.044);
      group.add(glass);
      group._mainMesh = frame;
      break;
    }
    case "painel": {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(L, D, T), null);
      panel.position.set(0, D / 2 + 0.3, 0);
      group.add(panel);
      group._mainMesh = panel;
      break;
    }
    case "vaso": {
      const pts = [];
      const h = Math.max(0.4, D * 0.8);
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const r = 0.04 + Math.sin(t * Math.PI) * (L / 4) * (0.65 + 0.35 * Math.sin(t * Math.PI * 1.5));
        pts.push(new THREE.Vector2(r, t * h));
      }
      const vaso = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), null);
      group.add(vaso);
      group._mainMesh = vaso;
      break;
    }
    default: {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(L, T, D), null);
      slab.position.y = T / 2;
      group.add(slab);
      group._mainMesh = slab;
      break;
    }
  }
  return group;
}

// ─── Acabamentos (perfis de borda extrudados) ─────────────────────────────
function criarAcabamento3D(THREE, tipoTrabalho) {
  const nome = (tipoTrabalho || "").toLowerCase();
  const n = nome.replace(/^acabamento[:\s]*/i, "").trim();
  const group = new THREE.Group();
  const W = 1.8;
  const H = 0.22;
  const COMP = 1.2;
  const R = H / 2;

  const shape = new THREE.Shape();

  if (n.includes("simples duplo")) {
    const c = H * 0.18;
    shape.moveTo(0, 0); shape.lineTo(0, H - c); shape.lineTo(c, H);
    shape.lineTo(W - c, H); shape.lineTo(W, H - c); shape.lineTo(W, 0); shape.lineTo(0, 0);
  } else if (n.includes("sanduíche recuado") || n.includes("sanduiche recuado")) {
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W * 0.85, H);
    shape.lineTo(W * 0.85, H * 0.6); shape.lineTo(W, H * 0.6);
    shape.lineTo(W, H * 0.4); shape.lineTo(W * 0.85, H * 0.4);
    shape.lineTo(W * 0.85, 0); shape.lineTo(0, 0);
  } else if (n.includes("sanduíche") || n.includes("sanduiche")) {
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.lineTo(W, H * 0.62); shape.lineTo(W + H * 0.12, H * 0.56);
    shape.lineTo(W + H * 0.12, H * 0.44); shape.lineTo(W, H * 0.38);
    shape.lineTo(W, 0); shape.lineTo(0, 0);
  } else if (n.includes("bisotê") || n.includes("bisote")) {
    shape.moveTo(0, 0); shape.lineTo(0, H);
    shape.lineTo(W - H * 0.8, H); shape.lineTo(W, H * 0.2);
    shape.lineTo(W, 0); shape.lineTo(0, 0);
  } else if (n.includes("chanfro duplo")) {
    shape.moveTo(0, 0); shape.lineTo(H * 0.5, H);
    shape.lineTo(W - H * 0.5, H); shape.lineTo(W, 0); shape.lineTo(0, 0);
  } else if (n.includes("chanfrado invertido") || n.includes("chanfro invertido")) {
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W * 0.85, H);
    shape.lineTo(W, 0); shape.lineTo(0, 0);
  } else if (n.includes("chanfrado") || n.includes("chanfro") || n.includes("45°") || n.includes("45 graus")) {
    shape.moveTo(0, 0); shape.lineTo(0, H);
    shape.lineTo(W - H, H); shape.lineTo(W, 0); shape.lineTo(0, 0);
  } else if (n.includes("boleado triplo c/") || n.includes("boleado triplo com")) {
    const s = H / 3;
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.quadraticCurveTo(W + R, H - s / 2, W + R, H - s);
    shape.quadraticCurveTo(W + R, H - s * 1.5, W, H - s);
    shape.quadraticCurveTo(W + R, H - s * 2, W + R, H - s * 2.5);
    shape.quadraticCurveTo(W + R, 0, W, 0); shape.lineTo(0, 0);
  } else if (n.includes("boleado duplo c/") || n.includes("boleado duplo com")) {
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.quadraticCurveTo(W + R, H * 0.75, W + R, H * 0.5);
    shape.quadraticCurveTo(W + R, H * 0.25, W, H * 0.5);
    shape.quadraticCurveTo(W + R, H * 0.25, W + R, 0);
    shape.lineTo(W, 0); shape.lineTo(0, 0);
  } else if (n.includes("boleado triplo")) {
    const s = H / 3;
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.quadraticCurveTo(W + R, H - s / 2, W + R, H - s);
    shape.quadraticCurveTo(W + R, H - s * 1.5, W, H - s);
    shape.quadraticCurveTo(W + R, H - s * 2, W + R, H - s * 2.5);
    shape.quadraticCurveTo(W + R, 0, W, 0); shape.lineTo(0, 0);
  } else if (n.includes("boleado duplo")) {
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.quadraticCurveTo(W + R, H * 0.75, W + R, H * 0.5);
    shape.quadraticCurveTo(W + R, H * 0.25, W, 0); shape.lineTo(0, 0);
  } else if (n.includes("boleado c/ rebaixo") || n.includes("boleado com rebaixo")) {
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.quadraticCurveTo(W + R, H * 0.5, W, 0);
    shape.lineTo(W * 0.65, 0); shape.lineTo(W * 0.65, -H * 0.15);
    shape.lineTo(0, -H * 0.15); shape.lineTo(0, 0);
  } else if (n.includes("boleado")) {
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.quadraticCurveTo(W + R, H * 0.5, W, 0); shape.lineTo(0, 0);
  } else if (n.includes("½ cana c/ boleado") || n.includes("1/2 cana c/ boleado") || n.includes("meia cana c/ boleado")) {
    shape.moveTo(0, 0); shape.lineTo(0, H);
    shape.quadraticCurveTo(W * 0.15, H + R * 0.6, W * 0.5, H + R * 0.6);
    shape.quadraticCurveTo(W * 0.85, H + R * 0.6, W, H);
    shape.quadraticCurveTo(W + R, H * 0.5, W, 0); shape.lineTo(0, 0);
  } else if (n.includes("½ cana c/ friso") || n.includes("1/2 cana c/ friso") || n.includes("meia cana c/ friso")) {
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.quadraticCurveTo(W - R, H * 0.5, W, 0);
    shape.lineTo(W + H * 0.1, 0); shape.lineTo(W + H * 0.1, H * 0.12);
    shape.lineTo(W + H * 0.2, H * 0.12); shape.lineTo(W + H * 0.2, 0);
    shape.lineTo(0, 0);
  } else if (n.includes("½ cana invertido") || n.includes("1/2 cana invertido") || n.includes("meia cana invertido")) {
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.quadraticCurveTo(W + R, H * 0.5, W, 0); shape.lineTo(0, 0);
  } else if (n.includes("½ cana triplo") || n.includes("1/2 cana triplo") || n.includes("½ cana tripla") || n.includes("1/2 cana tripla")) {
    const s = H / 3;
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.quadraticCurveTo(W - R, H - s * 0.5, W - R, H - s);
    shape.quadraticCurveTo(W - R, H - s * 1.5, W, H - s);
    shape.quadraticCurveTo(W - R, H - s * 2, W - R, H - s * 2.5);
    shape.quadraticCurveTo(W - R, 0, W, 0); shape.lineTo(0, 0);
  } else if (n.includes("½ cana duplo") || n.includes("1/2 cana duplo") || n.includes("½ cana dupla") || n.includes("1/2 cana dupla")) {
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.quadraticCurveTo(W - R, H * 0.75, W - R, H * 0.5);
    shape.quadraticCurveTo(W - R, H * 0.25, W, H * 0.5);
    shape.quadraticCurveTo(W - R, H * 0.25, W - R, 0);
    shape.lineTo(W, 0); shape.lineTo(0, 0);
  } else if (n.includes("½ cana") || n.includes("1/2 cana") || n.includes("meia cana")) {
    shape.moveTo(0, 0); shape.lineTo(0, H); shape.lineTo(W, H);
    shape.quadraticCurveTo(W - R, H * 0.5, W, 0); shape.lineTo(0, 0);
  } else if (n.includes("rebaixo invertido")) {
    shape.moveTo(0, 0); shape.lineTo(0, H * 0.4);
    shape.lineTo(W * 0.22, H * 0.4); shape.lineTo(W * 0.22, H);
    shape.lineTo(W, H); shape.lineTo(W, 0); shape.lineTo(0, 0);
  } else if (n.includes("rebaixo")) {
    shape.moveTo(0, 0); shape.lineTo(0, H);
    shape.lineTo(W * 0.65, H); shape.lineTo(W * 0.65, H * 0.6);
    shape.lineTo(W, H * 0.6); shape.lineTo(W, 0); shape.lineTo(0, 0);
  } else if (n.includes("espelho")) {
    shape.moveTo(0, 0); shape.lineTo(0, H);
    shape.quadraticCurveTo(W * 0.25, H + R * 0.6, W * 0.5, H + R * 0.6);
    shape.quadraticCurveTo(W * 0.75, H + R * 0.6, W, H);
    shape.lineTo(W, 0); shape.lineTo(0, 0);
  } else {
    shape.moveTo(0, 0); shape.lineTo(0, H);
    shape.lineTo(W, H); shape.lineTo(W, 0); shape.lineTo(0, 0);
  }

  const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: COMP, bevelEnabled: false });
  const mesh = new THREE.Mesh(geo, null);
  group.add(mesh);
  group._mainMesh = mesh;

  if (n.includes("sanduíche") || n.includes("sanduiche")) {
    const bs = new THREE.Shape();
    bs.moveTo(W - H * 0.1, H * 0.42); bs.lineTo(W + H * 0.14, H * 0.42);
    bs.lineTo(W + H * 0.14, H * 0.58); bs.lineTo(W - H * 0.1, H * 0.58);
    bs.lineTo(W - H * 0.1, H * 0.42);
    const bGeo = new THREE.ExtrudeGeometry(bs, { steps: 1, depth: COMP, bevelEnabled: false });
    group.add(new THREE.Mesh(bGeo, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })));
  }

  return group;
}

// ─── Textura procedural ────────────────────────────────────────────────────
function gerarTexturaProc(THREE, nomeMaterial) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const nome = (nomeMaterial || "").toLowerCase();

  const flags = {
    branco: nome.includes("branco") || nome.includes("white") || nome.includes("neve") || nome.includes("polar"),
    preto: nome.includes("preto") || nome.includes("black") || nome.includes("negro") || nome.includes("absolute"),
    cinza: nome.includes("cinza") || nome.includes("grey") || nome.includes("gray") || nome.includes("prata") || nome.includes("silver"),
    verde: nome.includes("verde") || nome.includes("green") || nome.includes("ubatuba") || nome.includes("labrador"),
    azul: nome.includes("azul") || nome.includes("blue") || nome.includes("bahia"),
    roxo: nome.includes("roxo") || nome.includes("lilas") || nome.includes("violeta") || nome.includes("purple"),
    ocre: nome.includes("ocre") || nome.includes("gold") || nome.includes("dourado") || nome.includes("amarelo") || nome.includes("mel"),
    marfim: nome.includes("marfim") || nome.includes("bege") || nome.includes("creme") || nome.includes("champagne"),
    rosa: nome.includes("rosa") || nome.includes("pink") || nome.includes("salmon") || nome.includes("coral"),
    vermelho: nome.includes("vermelho") || nome.includes("red") || nome.includes("rubi") || nome.includes("bordeaux"),
    cobre: nome.includes("cobre") || nome.includes("copper") || nome.includes("bronze") || nome.includes("ferrugem"),
    marmore: nome.includes("mármore") || nome.includes("marmore") || nome.includes("marble"),
    granito: nome.includes("granito") || nome.includes("granite"),
    quartzito: nome.includes("quartzito") || nome.includes("quartzite") || nome.includes("quartz"),
    travertino: nome.includes("travertino"),
    onix: nome.includes("ônix") || nome.includes("onix") || nome.includes("onyx"),
  };

  const paletas = {
    branco:   { f: "#f5f0eb", b: "#faf7f4", v1: "#e8e0d8", v2: "#d0c8c0" },
    preto:    { f: "#0d0d0d", b: "#1a1a1a", v1: "#252525", v2: "#333333" },
    cinza:    { f: "#4a4a4a", b: "#606060", v1: "#808080", v2: "#a0a0a0" },
    verde:    { f: "#1e3a28", b: "#2d5038", v1: "#3d6848", v2: "#8ab890" },
    azul:     { f: "#1a2d4a", b: "#243860", v1: "#3a5280", v2: "#90b0d8" },
    roxo:     { f: "#2e1848", b: "#3d225e", v1: "#5a3280", v2: "#c0a0e8" },
    ocre:     { f: "#7a5a18", b: "#9a7228", v1: "#c89838", v2: "#e8c860" },
    marfim:   { f: "#d8cdb8", b: "#e8ddc8", v1: "#c8bda8", v2: "#b8ad98" },
    rosa:     { f: "#b06070", b: "#c87888", v1: "#d898a0", v2: "#f0c0c8" },
    vermelho: { f: "#6a1018", b: "#8a1828", v1: "#aa2838", v2: "#d05060" },
    cobre:    { f: "#6a3010", b: "#8a4820", v1: "#b06030", v2: "#d88050" },
  };

  const coresAtivas = Object.keys(paletas).filter((k) => flags[k]);
  let paleta;
  if (coresAtivas.length === 0) {
    paleta = { f: "#6a5848", b: "#7a6858", v1: "#9a8878", v2: "#b8a898" };
  } else if (coresAtivas.length === 1) {
    paleta = paletas[coresAtivas[0]];
  } else {
    const p1 = paletas[coresAtivas[0]], p2 = paletas[coresAtivas[1]];
    paleta = {
      f: misturarCores(p1.f, p2.f, 0.6), b: misturarCores(p1.b, p2.b, 0.6),
      v1: misturarCores(p1.v1, p2.v1, 0.5), v2: misturarCores(p1.v2, p2.v2, 0.4),
    };
  }

  ctx.fillStyle = paleta.f;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * 2.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? paleta.v1 : paleta.b;
    ctx.globalAlpha = 0.05 + Math.random() * 0.15; ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (flags.granito) {
    for (let i = 0; i < 700; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, r = 1 + Math.random() * 4;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = [paleta.v1, paleta.v2, paleta.b, "#ffffff55"][Math.floor(Math.random() * 4)];
      ctx.globalAlpha = 0.35 + Math.random() * 0.45; ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (flags.marmore || flags.onix || flags.quartzito) {
    for (let v = 0; v < 10; v++) {
      ctx.beginPath();
      let cx = Math.random() * 512, cy = Math.random() * 512;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 14; s++) {
        cx += (Math.random() - 0.4) * 55; cy += (Math.random() - 0.3) * 45;
        ctx.quadraticCurveTo(cx + (Math.random() - 0.5) * 35, cy + (Math.random() - 0.5) * 35, cx, cy);
      }
      ctx.strokeStyle = v % 2 === 0 ? paleta.v1 : paleta.v2;
      ctx.lineWidth = 0.5 + Math.random() * 2.5;
      ctx.globalAlpha = 0.25 + Math.random() * 0.45; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (flags.travertino) {
    for (let ly = 0; ly < 512; ly += 8 + Math.random() * 14) {
      ctx.beginPath(); ctx.moveTo(0, ly);
      for (let lx = 0; lx < 512; lx += 20) ctx.lineTo(lx, ly + (Math.random() - 0.5) * 5);
      ctx.strokeStyle = paleta.v1; ctx.lineWidth = 1 + Math.random() * 3;
      ctx.globalAlpha = 0.2 + Math.random() * 0.3; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    for (let v = 0; v < 5; v++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.bezierCurveTo(Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512);
      ctx.strokeStyle = paleta.v1; ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.globalAlpha = 0.2; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const grad = ctx.createRadialGradient(180, 150, 10, 200, 200, 350);
  grad.addColorStop(0, "rgba(255,255,255,0.12)"); grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function misturarCores(hex1, hex2, peso) {
  const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [r1, g1, b1] = p(hex1), [r2, g2, b2] = p(hex2);
  const r = Math.round(r1 * peso + r2 * (1 - peso));
  const g = Math.round(g1 * peso + g2 * (1 - peso));
  const b = Math.round(b1 * peso + b2 * (1 - peso));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── Componente principal ─────────────────────────────────────────────────
export function Visualizador3D({ item, onFechar }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [carregando, setCarregando] = useState(true);
  const [labelCategoria, setLabelCategoria] = useState("");
  const zoomRef = useRef(5);

  useEffect(() => {
    let animId;

    async function init() {
      setCarregando(true);

      const categoria = detectarCategoria(item.tipo_trabalho || "");
      const isAcabamento = categoria === "acabamento";
      const { L, D, T } = calcDimensoes(categoria, item.quantidade);
      const cam = cameraConfig(categoria);

      const nomeCat = {
        acabamento: "perfil de borda extrudado",
        bancada: "bancada em pedra",
        pia: "pia / bancada com cuba",
        mesa: "tampo de mesa",
        escada: "degrau / escada",
        soleira: "soleira / peitoril",
        coluna: "coluna / pilar",
        espelho: "espelho em pedra",
        painel: "painel / revestimento",
        vaso: "vaso decorativo",
        placa: "chapa / placa",
      }[categoria] ?? "peça em pedra";
      setLabelCategoria(nomeCat);

      const THREE = await import("three");
      const canvas = canvasRef.current;
      if (!canvas) return;

      const w = canvas.clientWidth || canvas.offsetWidth || 640;
      const h = canvas.clientHeight || canvas.offsetHeight || 380;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1f2e);

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);

      scene.add(new THREE.AmbientLight(0x6080c0, 0.8));
      const dirLight = new THREE.DirectionalLight(0xfff5e0, 1.5);
      dirLight.position.set(5, 8, 5); dirLight.castShadow = true; scene.add(dirLight);
      scene.add(Object.assign(new THREE.DirectionalLight(0x4060ff, 0.4), { position: { x: -4, y: 2, z: -4, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } } }));
      const fillLight = new THREE.DirectionalLight(0x4060ff, 0.4);
      fillLight.position.set(-4, 2, -4); scene.add(fillLight);
      const rimLight = new THREE.PointLight(0x80a0ff, 0.5, 15);
      rimLight.position.set(-3, 4, -2); scene.add(rimLight);
      scene.add(new THREE.GridHelper(10, 20, 0x334466, 0x223355));

      const grupo = isAcabamento
        ? criarAcabamento3D(THREE, item.tipo_trabalho)
        : criarPeca3D(THREE, categoria, L, D, T);

      let textura;
      if (item.imagem_url) {
        const loader = new THREE.TextureLoader();
        textura = await new Promise((res) =>
          loader.load(item.imagem_url, (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); res(t); }, undefined, () => res(gerarTexturaProc(THREE, item.descricao))),
        );
      } else {
        textura = gerarTexturaProc(THREE, item.descricao);
      }

      const isEsp = categoria === "espelho";
      const materialPedra = new THREE.MeshStandardMaterial({
        map: textura,
        roughness: isEsp ? 0.05 : 0.25,
        metalness: isEsp ? 0.9 : 0.05,
      });

      grupo.traverse((obj) => {
        if (obj.isMesh && obj.material === null) obj.material = materialPedra;
      });
      if (grupo._extraMesh?.material === null) grupo._extraMesh.material = materialPedra;

      const box = new THREE.Box3().setFromObject(grupo);
      const center = new THREE.Vector3();
      box.getCenter(center);
      grupo.position.sub(center);
      scene.add(grupo);

      sceneRef.current = { scene, camera, renderer, grupo };
      setCarregando(false);

      zoomRef.current = cam.zoom;
      let isDragging = false, lastX = 0, lastY = 0;
      let rotY = cam.rotY, rotX = cam.rotX;

      canvas.addEventListener("mousedown", (e) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; });
      canvas.addEventListener("mouseup", () => { isDragging = false; });
      canvas.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        rotY += (e.clientX - lastX) * 0.01; rotX += (e.clientY - lastY) * 0.008;
        lastX = e.clientX; lastY = e.clientY;
      });

      let lastTouchX = 0, lastTouchY = 0, lastPinchDist = 0;
      canvas.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) { lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; }
        else if (e.touches.length === 2) lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      });
      canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          rotY += (e.touches[0].clientX - lastTouchX) * 0.01; rotX += (e.touches[0].clientY - lastTouchY) * 0.008;
          lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          zoomRef.current = Math.max(1, Math.min(12, zoomRef.current - (dist - lastPinchDist) * 0.02));
          lastPinchDist = dist;
        }
      }, { passive: false });
      canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        zoomRef.current = Math.max(1, Math.min(12, zoomRef.current + e.deltaY * 0.005));
      }, { passive: false });

      function animate() {
        animId = requestAnimationFrame(animate);
        if (!isDragging && !isAcabamento) rotY += 0.003;
        const r = zoomRef.current;
        camera.position.x = Math.sin(rotY) * r * Math.cos(rotX);
        camera.position.z = Math.cos(rotY) * r * Math.cos(rotX);
        camera.position.y = r * Math.sin(rotX);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      }
      animate();
    }

    init().catch(() => setCarregando(false));
    return () => { cancelAnimationFrame(animId); sceneRef.current?.renderer.dispose(); };
  }, [item]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div>
            <h3 className="text-gray-100 font-semibold text-base">Visualização 3D</h3>
            <p className="text-gray-400 text-xs mt-0.5">
              <span className="text-blue-400">{item.descricao}</span>
              {item.tipo_trabalho && (
                <span className="ml-2 bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full text-xs">
                  {item.tipo_trabalho}
                </span>
              )}
              {labelCategoria && (
                <span className="ml-2 text-gray-500 text-xs italic">{labelCategoria}</span>
              )}
            </p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="relative" style={{ height: 380 }}>
          {carregando && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-400 text-sm">Carregando modelo 3D...</p>
            </div>
          )}
          <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" style={{ display: "block" }} />
        </div>

        <div className="px-5 py-3 border-t border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { zoomRef.current = Math.max(1, zoomRef.current - 1); }}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title="Aproximar"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => { zoomRef.current = Math.min(12, zoomRef.current + 1); }}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title="Afastar"
            >
              <ZoomOut size={16} />
            </button>
          </div>
          <p className="text-gray-500 text-xs">
            {item.imagem_url ? "✦ Textura real do material" : "✦ Textura procedural"}
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
      {aberto && <Visualizador3D item={item} onFechar={() => setAberto(false)} />}
    </>
  );
}
