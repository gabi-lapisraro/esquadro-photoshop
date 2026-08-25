// Funções da API do Photoshop (UXP)
let ps = null;

try {
  ps = require("photoshop");
} catch (e) {
  console.log("Photoshop core não encontrado (rodando no browser/sandbox).");
}

// Limite de dimensão de um documento PSD. Acima disso o Photoshop recusa a criação.
const MAX_DOC_DIMENSION = 30000;

const GAP = 200; // Espaçamento entre pranchetas

/** Direção de guia, preferindo a constante da API e caindo para string. */
function _direction(kind) {
  const dir = ps && ps.constants && ps.constants.Direction;
  if (dir) return kind === "horizontal" ? dir.HORIZONTAL : dir.VERTICAL;
  return kind;
}

/**
 * Traduz o `colorMode` do guia de formatos para a constante do UXP,
 * mantendo a string original como fallback.
 */
function _colorMode(raw) {
  const modes = ps && ps.constants && ps.constants.NewDocumentMode;
  if (!modes) return raw || "RGBColorMode";

  switch (raw) {
    case "CMYKColorMode": return modes.CMYK;
    case "GrayscaleMode": return modes.GRAYSCALE;
    case "LabColorMode": return modes.LAB;
    case "BitmapMode": return modes.BITMAP;
    case "RGBColorMode":
    default: return modes.RGB;
  }
}

/** Valida o formato antes de qualquer chamada à API. */
function _validateFormat(fmt) {
  if (!fmt) return "Nenhum formato selecionado.";
  if (!fmt.width || !fmt.height) {
    return `O formato "${fmt.name || fmt.id || "?"}" não tem dimensões definidas.`;
  }
  return null;
}

/**
 * Quantas pranchetas deste formato cabem em um documento, e se `count` cabe.
 * Função pura — não toca na API do Photoshop.
 *
 * @returns {{ok: boolean, maxCount: number, totalWidth: number, message?: string}}
 */
function checkCapacity(fmt, count) {
  const qty = Math.max(1, parseInt(count, 10) || 1);

  if (!fmt || !fmt.width || !fmt.height) {
    return { ok: false, maxCount: 0, totalWidth: 0, message: "Formato sem dimensões." };
  }

  if (fmt.height > MAX_DOC_DIMENSION) {
    return {
      ok: false,
      maxCount: 0,
      totalWidth: 0,
      message: `A altura de ${fmt.height}px excede o limite do Photoshop (${MAX_DOC_DIMENSION}px).`
    };
  }

  // maxCount resolve: n*width + (n-1)*gap <= MAX  ->  n <= (MAX + gap) / (width + gap)
  const maxCount = Math.max(1, Math.floor((MAX_DOC_DIMENSION + GAP) / (fmt.width + GAP)));
  const totalWidth = (fmt.width * qty) + (GAP * (qty - 1));

  if (totalWidth > MAX_DOC_DIMENSION) {
    return {
      ok: false,
      maxCount,
      totalWidth,
      message: `${qty}× ${fmt.width}px daria ${totalWidth}px, acima do limite do Photoshop (${MAX_DOC_DIMENSION}px). Máximo para este formato: ${maxCount}.`
    };
  }

  return { ok: true, maxCount, totalWidth };
}

/**
 * Cria pranchetas (Artboards) reais no Photoshop usando batchPlay
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function createArtboards(fmt, count, docName) {
  if (!ps || !ps.app) {
    return { ok: false, message: "Photoshop não disponível (fora do ambiente UXP)." };
  }

  const invalid = _validateFormat(fmt);
  if (invalid) return { ok: false, message: invalid };

  const qty = Math.max(1, parseInt(count, 10) || 1);
  const capacity = checkCapacity(fmt, qty);
  if (!capacity.ok) return { ok: false, message: capacity.message };

  const totalWidth = capacity.totalWidth;
  const totalHeight = fmt.height;

  // Nome base do arquivo. Se a UI não mandar, cai no nome do formato — assim a
  // função continua usável fora do painel.
  const base = (docName && String(docName).trim()) || `${fmt.name} - ESQUADЯO`;

  const { app, core, constants } = ps;
  const { batchPlay } = ps.action;

  try {
    await core.executeAsModal(async () => {
      // 1. Documento do tamanho total, começando em (0,0) para as coordenadas baterem
      const doc = await app.documents.add({
        width: totalWidth,
        height: totalHeight,
        resolution: fmt.resolution || 72,
        mode: _colorMode(fmt.colorMode),
        fill: (constants && constants.DocumentFill && constants.DocumentFill.TRANSPARENT) || "transparent",
        name: base
      });

      if (!doc) throw new Error("Não foi possível criar o documento.");

      console.log(
        `[ESQUADRO] doc "${base}": pedido ${totalWidth}x${totalHeight}` +
        ` / obtido ${doc.width}x${doc.height} @ ${doc.resolution}dpi` +
        ` — ${qty} prancheta(s) de ${fmt.width}x${fmt.height}, intervalo ${GAP}`
      );

      // 2. Uma prancheta por cópia, lado a lado. As guias vão logo depois de
      //    cada prancheta, enquanto ela é a ativa: no Photoshop a guia criada
      //    com prancheta ativa PERTENCE a ela e é medida a partir da borda
      //    dela, não do canvas. Por isso o offset aqui é ZERO — somar o `left`
      //    jogava a guia para fora dos limites da prancheta, e o Photoshop
      //    simplesmente não a desenhava (só a primeira aparecia, onde
      //    relativo e absoluto coincidem).
      for (let i = 0; i < qty; i++) {
        const left = i * (fmt.width + GAP);

        // Prancheta única não leva sufixo; com mais de uma, _1, _2, _3...
        const nome = qty > 1 ? `${base}_${i + 1}` : base;

        await _makeArtboard(nome, left, 0, fmt.width, fmt.height);

        _drawVerticalGuides(doc, fmt, 0);
        _drawHorizontalGuides(doc, fmt, 0);
      }

      _logGuias(doc);
    }, { commandName: "Criar Pranchetas ESQUADЯO" });

    return { ok: true, message: `${qty} prancheta(s) de ${fmt.name} criada(s).` };
  } catch (err) {
    console.error("[ESQUADRO] createArtboards:", err);
    return { ok: false, message: _humanError(err) };
  }
}

/**
 * Aplica guias no documento aberto (prancheta ativa ou documento simples)
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function applyGuides(fmt) {
  if (!ps || !ps.app) {
    return { ok: false, message: "Photoshop não disponível (fora do ambiente UXP)." };
  }

  const invalid = _validateFormat(fmt);
  if (invalid) return { ok: false, message: invalid };

  if (!fmt.safe && !fmt.crop) {
    return { ok: false, message: `"${fmt.name}" não tem guias definidas no guia de formatos.` };
  }

  const { app, core } = ps;

  if (!app.activeDocument) {
    return { ok: false, message: "Abra um documento antes de aplicar as guias." };
  }

  try {
    let onArtboard = false;

    await core.executeAsModal(async () => {
      const doc = app.activeDocument;

      // A detecção serve só para a mensagem. O offset é sempre ZERO: com
      // prancheta ativa a guia é medida a partir da borda dela, e sem
      // prancheta é medida a partir do canvas — nos dois casos a origem já é
      // o ponto de partida certo.
      onArtboard = (await _findArtboardOffset(doc)) !== null;

      _drawVerticalGuides(doc, fmt, 0);
      _drawHorizontalGuides(doc, fmt, 0);
    }, { commandName: "Aplicar Guias de Segurança" });

    return {
      ok: true,
      message: onArtboard
        ? "Guias aplicadas na prancheta ativa."
        : "Guias aplicadas no documento."
    };
  } catch (err) {
    console.error("[ESQUADRO] applyGuides:", err);
    return { ok: false, message: _humanError(err) };
  }
}

/**
 * Lista no log as guias que o documento realmente tem.
 * Serve para saber se a coordenada gravada é relativa à prancheta ou ao canvas
 * — a olho nu as duas são indistinguíveis na primeira prancheta.
 */
function _logGuias(doc) {
  try {
    const gs = doc.guides;
    const total = gs.length;
    const lista = [];
    for (let i = 0; i < total; i++) {
      const g = gs[i];
      const c = g.coordinate;
      // coordinate pode vir como número ou como UnitValue
      const valor = (c && typeof c === "object" && "value" in c) ? c.value : c;
      lista.push(`${g.direction}@${valor}`);
    }
    console.log(`[ESQUADRO] ${total} guia(s) no documento: ${lista.join(", ")}`);
  } catch (e) {
    console.log(`[ESQUADRO] não consegui listar as guias: ${e && e.message}`);
  }
}

/** Retângulo no formato que o batchPlay espera. */
function _rect(left, top, width, height) {
  return {
    _obj: "classFloatRect",
    top: top,
    left: left,
    bottom: top + height,
    right: left + width
  };
}

/** Camada ativa, como alvo de descritor. */
const _CAMADA_ATIVA = { _ref: "layer", _enum: "ordinal", _value: "targetEnum" };

/**
 * Cria uma prancheta com posição e tamanho exatos.
 *
 * O `artboardRect` precisa vir ANINHADO sob um objeto `artboard` — é a mesma
 * forma em que o Photoshop devolve na leitura (`res.artboard.artboardRect`).
 * Passando `artboardRect` solto no `using`, o Photoshop ignora o retângulo em
 * silêncio, usa o tamanho do documento e empilha as pranchetas adjacentes.
 *
 * Depois do `make`, o retângulo é reforçado com `editArtboardEvent`, porque o
 * `make` também ajusta a prancheta ao conteúdo da camada que ele absorve.
 *
 * @returns {Promise<{left:number,top:number,right:number,bottom:number}|null>} rect obtido
 */
async function _makeArtboard(nome, left, top, width, height) {
  const { batchPlay } = ps.action;
  const opts = { synchronousExecution: true, modalBehavior: "execute" };

  await batchPlay([{
    _obj: "make",
    _target: [{ _ref: "artboardSection" }],
    using: {
      _obj: "artboardSection",
      artboard: {
        _obj: "artboard",
        artboardRect: _rect(left, top, width, height)
      },
      name: nome
    }
  }], opts);

  // Reforça posição e tamanho na prancheta recém-criada (que está ativa).
  try {
    await batchPlay([{
      _obj: "editArtboardEvent",
      _target: [_CAMADA_ATIVA],
      artboard: {
        _obj: "artboard",
        artboardRect: _rect(left, top, width, height)
      }
    }], opts);
  } catch (e) {
    console.log(`[ESQUADRO] editArtboardEvent falhou em "${nome}": ${e && e.message}`);
  }

  // Confere o que o Photoshop realmente aplicou — sem isso um desvio de
  // geometria passa em silêncio, que foi o que aconteceu no teste de 25/08.
  const obtido = await _lerArtboardRect();
  if (obtido) {
    const okPos = Math.abs(obtido.left - left) < 1 && Math.abs(obtido.top - top) < 1;
    const okTam = Math.abs((obtido.right - obtido.left) - width) < 1 &&
                  Math.abs((obtido.bottom - obtido.top) - height) < 1;
    if (!okPos || !okTam) {
      console.log(
        `[ESQUADRO] "${nome}" saiu diferente do pedido.` +
        ` pedido: ${left},${top} ${width}x${height}` +
        ` obtido: ${obtido.left},${obtido.top} ` +
        `${obtido.right - obtido.left}x${obtido.bottom - obtido.top}`
      );
    }
  } else {
    console.log(`[ESQUADRO] não consegui ler o rect de "${nome}".`);
  }
  return obtido;
}

/** Lê o artboardRect da camada ativa, ou null se não for prancheta. */
async function _lerArtboardRect() {
  const { batchPlay } = ps.action;
  try {
    const [res] = await batchPlay([{
      _obj: "get",
      _target: [{ _property: "artboard" }, _CAMADA_ATIVA]
    }], { synchronousExecution: true });
    const rect = res && res.artboard && res.artboard.artboardRect;
    if (!rect) return null;
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  } catch (e) {
    return null;
  }
}

/**
 * Descobre o offset (canto superior esquerdo) da prancheta que contém a camada ativa.
 *
 * `layer.kind` do UXP não expõe "artboard" — uma prancheta é um group com a
 * propriedade `artboard` no descritor. Por isso a leitura é via batchPlay, subindo
 * a hierarquia até achar uma prancheta (a camada ativa pode estar dentro dela).
 *
 * @returns {Promise<{x: number, y: number}|null>} null se não estiver em prancheta
 */
async function _findArtboardOffset(doc) {
  const { batchPlay } = ps.action;

  let layer = null;
  try {
    layer = doc.activeLayers && doc.activeLayers[0];
  } catch (e) {
    return null;
  }
  if (!layer) return null;

  // Sobe no máximo 10 níveis para não arriscar loop em hierarquia inesperada
  for (let depth = 0; layer && depth < 10; depth++) {
    try {
      const [res] = await batchPlay(
        [
          {
            _obj: "get",
            _target: [
              { _property: "artboard" },
              { _ref: "layer", _id: layer.id }
            ]
          }
        ],
        { synchronousExecution: true }
      );

      const info = res && res.artboard;
      const rect = info && info.artboardRect;

      if (info && info.artboardEnabled && rect) {
        return { x: rect.left, y: rect.top };
      }
    } catch (e) {
      // Camada sem propriedade de prancheta: apenas continua subindo
    }

    layer = layer.parent;
  }

  return null;
}

/** Guias horizontais (safe zone e corte no eixo vertical) */
function _drawHorizontalGuides(doc, fmt, offsetY) {
  const height = fmt.height;
  const h = _direction("horizontal");

  if (fmt.safe) {
    if (fmt.safe.top) doc.guides.add(h, offsetY + fmt.safe.top);
    if (fmt.safe.bottom) doc.guides.add(h, offsetY + height - fmt.safe.bottom);
  }

  if (fmt.crop) {
    if (fmt.crop.top) doc.guides.add(h, offsetY + fmt.crop.top);
    if (fmt.crop.bottom) doc.guides.add(h, offsetY + height - fmt.crop.bottom);
  }
}

/** Guias verticais (safe zone e corte lateral) */
function _drawVerticalGuides(doc, fmt, offsetX) {
  const width = fmt.width;
  const v = _direction("vertical");

  if (fmt.safe) {
    if (fmt.safe.left) doc.guides.add(v, offsetX + fmt.safe.left);
    if (fmt.safe.right) doc.guides.add(v, offsetX + width - fmt.safe.right);
  }

  if (fmt.crop && fmt.crop.lateral) {
    doc.guides.add(v, offsetX + fmt.crop.lateral);
    doc.guides.add(v, offsetX + width - fmt.crop.lateral);
  }
}

/** Mensagem de erro legível a partir do que a API do UXP devolve. */
function _humanError(err) {
  if (!err) return "Erro desconhecido.";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  return String(err);
}

module.exports = {
  createArtboards,
  applyGuides,
  checkCapacity
};
