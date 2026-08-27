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

      // 2. Uma prancheta por cópia, lado a lado.
      //    A coordenada de guia é ABSOLUTA, medida do canvas, e não relativa à
      //    prancheta ativa. Confirmado em 25/08/2026: com offset zero, os três
      //    pares saíram todos em 135/945 e empilharam na primeira prancheta.
      //    Por isso a guia vertical soma o `left` da prancheta.
      for (let i = 0; i < qty; i++) {
        const left = i * (fmt.width + GAP);

        // A prancheta leva só o NÚMERO dela. A nomenclatura inteira
        // (#TAЯEFA_IG_FEED_2508) fica no nome do DOCUMENTO, onde ela importa:
        // é o nome do arquivo que vai circular. Repeti-la em cada prancheta só
        // enchia a paleta de camadas de linha longa e igual, e quem procura uma
        // prancheta procura pela ordem dela, não pelo nome da tarefa.
        const nome = String(i + 1);

        await _makeArtboard(nome, left, 0, fmt.width, fmt.height);

        // A ÁREA SEGURA vai em todas as pranchetas; a LINHA DE CORTE, só na
        // primeira. O corte serve para conferir o enquadramento uma vez — nas
        // cópias ele só polui, e quem quiser em outra usa o "Aplicar Guias",
        // que é livre.
        _drawVerticalGuides(doc, fmt, left, i === 0);
      }

      // Guia horizontal atravessa o canvas inteiro, então uma vez serve para as
      // três pranchetas: todas começam no topo 0. Por isso ela não tem como ser
      // "só na primeira" — e não precisa: nenhum dos formatos com corte usa
      // corte horizontal, são todos laterais.
      _drawHorizontalGuides(doc, fmt, 0);

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

    let conflito = null;

    await core.executeAsModal(async () => {
      const doc = app.activeDocument;

      // As guias vão para a prancheta que contém a camada selecionada. Como a
      // coordenada é absoluta, o canto dela entra como offset.
      const board = await _findArtboardOffset(doc);
      onArtboard = board !== null;

      // Se a prancheta selecionada não tem o tamanho do formato escolhido, as
      // guias sairiam no lugar errado. É exatamente o erro silencioso que este
      // plugin existe para evitar, então recusa em vez de desenhar torto.
      if (board && (Math.abs(board.width - fmt.width) > 1 ||
                    Math.abs(board.height - fmt.height) > 1)) {
        conflito = `A prancheta selecionada é ${Math.round(board.width)}×${Math.round(board.height)}` +
                   ` e "${fmt.name}" é ${fmt.width}×${fmt.height}. Escolha o formato que corresponde.`;
        return;
      }

      _drawVerticalGuides(doc, fmt, board ? board.x : 0);
      _drawHorizontalGuides(doc, fmt, board ? board.y : 0);
    }, { commandName: "Aplicar Guias de Segurança" });

    if (conflito) return { ok: false, message: conflito };

    return {
      ok: true,
      message: onArtboard
        ? "Guias aplicadas na prancheta selecionada."
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
 * Fundo da prancheta: TRANSPARENTE.
 *
 * A prancheta tem cor de fundo PRÓPRIA, separada do documento. O documento já
 * nasce transparente (`DocumentFill.TRANSPARENT` no `documents.add`), mas a
 * prancheta vinha branca — que é o padrão do Photoshop quando ninguém diz nada.
 *
 * `artboardBackgroundType` é o campo, e o valor vai na ordem em que as opções
 * aparecem nas Propriedades da prancheta: Branco, Preto, Transparente, Outro.
 * Daí o 3. CONFIRMADO no painel em 27/08/2026: a prancheta nasce transparente.
 * A conferência abaixo fica, porque pedir não é obter — se um dia o Photoshop
 * mudar o significado do valor, o log diz com o que a prancheta ficou.
 */
const _FUNDO_TRANSPARENTE = 3;

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
        artboardRect: _rect(left, top, width, height),
        artboardBackgroundType: _FUNDO_TRANSPARENTE
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
        artboardRect: _rect(left, top, width, height),
        artboardBackgroundType: _FUNDO_TRANSPARENTE
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
    // O fundo é conferido igual à geometria, e pelo mesmo motivo: pedir não é
    // obter. Se o valor não for o pedido, o log diz o que a prancheta ficou
    // tendo — e esse número é a resposta para qual valor usar.
    if (obtido.fundo !== undefined && obtido.fundo !== _FUNDO_TRANSPARENTE) {
      console.log(
        `[ESQUADRO] "${nome}": pedi fundo ${_FUNDO_TRANSPARENTE} (transparente)` +
        ` e a prancheta ficou com ${obtido.fundo}.` +
        ` Trocar _FUNDO_TRANSPARENTE para o valor certo em js/photoshop.js.`
      );
    }

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
    return {
      left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
      // o fundo vem junto: é o que permite conferir se o transparente pegou
      fundo: res.artboard.artboardBackgroundType
    };
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
 * @returns {Promise<{x,y,width,height}|null>} null se não estiver em prancheta
 */
async function _findArtboardOffset(doc) {
  const { batchPlay } = ps.action;

  // 1) A camada ativa via targetEnum. É o mesmo caminho usado na criação, que
  //    já se provou confiável. Não exige `artboardEnabled`: essa flag não vem
  //    sempre no descritor, e exigir ela fazia a detecção devolver null — a
  //    guia caía em (0,0), ou seja, na primeira prancheta.
  const direto = await _lerArtboardRect();
  if (direto) {
    console.log(`[ESQUADRO] prancheta ativa: ${direto.left},${direto.top} ` +
                `${direto.right - direto.left}x${direto.bottom - direto.top}`);
    return {
      x: direto.left,
      y: direto.top,
      width: direto.right - direto.left,
      height: direto.bottom - direto.top
    };
  }

  // 2) A camada selecionada pode estar DENTRO da prancheta. Sobe a hierarquia.
  let layer = null;
  try {
    layer = doc.activeLayers && doc.activeLayers[0];
  } catch (e) {
    return null;
  }

  for (let depth = 0; layer && depth < 10; depth++) {
    try {
      const [res] = await batchPlay([{
        _obj: "get",
        _target: [{ _property: "artboard" }, { _ref: "layer", _id: layer.id }]
      }], { synchronousExecution: true });

      const rect = res && res.artboard && res.artboard.artboardRect;
      if (rect && (rect.right - rect.left) > 0) {
        console.log(`[ESQUADRO] prancheta do ancestral "${layer.name}": ` +
                    `${rect.left},${rect.top} ${rect.right - rect.left}x${rect.bottom - rect.top}`);
        return {
          x: rect.left,
          y: rect.top,
          width: rect.right - rect.left,
          height: rect.bottom - rect.top
        };
      }
    } catch (e) {
      // camada sem propriedade de prancheta: segue subindo
    }
    layer = layer.parent;
  }

  console.log("[ESQUADRO] nenhuma prancheta detectada; guias vão para o canvas.");
  return null;
}

/** Guias horizontais (safe zone e corte no eixo vertical) */
function _drawHorizontalGuides(doc, fmt, offsetY, comCorte = true) {
  const height = fmt.height;
  const h = _direction("horizontal");

  if (fmt.safe) {
    if (fmt.safe.top) doc.guides.add(h, offsetY + fmt.safe.top);
    if (fmt.safe.bottom) doc.guides.add(h, offsetY + height - fmt.safe.bottom);
  }

  if (comCorte && fmt.crop) {
    if (fmt.crop.top) doc.guides.add(h, offsetY + fmt.crop.top);
    if (fmt.crop.bottom) doc.guides.add(h, offsetY + height - fmt.crop.bottom);
  }
}

/** Guias verticais (safe zone e corte lateral) */
function _drawVerticalGuides(doc, fmt, offsetX, comCorte = true) {
  const width = fmt.width;
  const v = _direction("vertical");

  if (fmt.safe) {
    if (fmt.safe.left) doc.guides.add(v, offsetX + fmt.safe.left);
    if (fmt.safe.right) doc.guides.add(v, offsetX + width - fmt.safe.right);
  }

  if (comCorte && fmt.crop && fmt.crop.lateral) {
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
