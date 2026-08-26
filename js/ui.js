let platformsData = {};
let createCallback = null;
let guidesCallback = null;

let currentPlatform = 'instagram'; // padrão inicial
let currentMode = 'organic';       // padrão inicial

// Quando a plataforma só existe em um dos modos, o modo fica travado nele.
// Guardado em JS porque o subset de CSS do UXP não garante `pointer-events`.
let modeLocked = null;

const els = {};

const platformNames = {
  'instagram': 'Instagram',
  'facebook': 'Facebook',
  'facebook_ads': 'Facebook Ads',
  'linkedin': 'LinkedIn',
  'tiktok': 'TikTok',
  'whatsapp': 'WhatsApp',
  'youtube': 'YouTube',
  'youtube_ads': 'YouTube Ads',
  'google_ads': 'Google Ads',
  'meta_ads': 'Meta Ads',
  'twitter': 'X',
  'twitter_ads': 'X Ads',
  'uber': 'Uber',
  'ifood': 'iFood',
  'ooh': 'OOH'
};

// Abreviação de plataforma usada no nome do arquivo.
// Padrão: #TAREFA_PLATAFORMA_FORMATO_DDMM  →  #TAREFA_IG_STORY_2508
// Cada prancheta ganha _1, _2... quando há mais de uma.
// Editar aqui muda o nome de todo arquivo gerado.
const PLATFORM_ABBR = {
  'instagram': 'IG',
  'facebook': 'FB',
  'facebook_ads': 'FBADS',
  'linkedin': 'LKD',
  'tiktok': 'TKT',
  'whatsapp': 'WPP',
  'youtube': 'YT',
  'youtube_ads': 'YTADS',
  'meta_ads': 'MADS',
  'google_ads': 'GADS',
  'twitter': 'X',
  'twitter_ads': 'XADS',
  'uber': 'UBER',
  'ifood': 'IFOOD'
};

// Abreviação de formato. Só os nomes que ficariam ruins na derivação
// automática entram aqui — o resto sai do próprio nome do formato.
const FORMAT_ABBR = {
  'Perfil / Destaques': 'PERFIL',
  'Capa (Grupos)': 'CAPA',
  'Capa (Eventos)': 'EVENTOS',
  'Capa (Thumbnail)': 'CAPA',
  'Capa Business': 'BUSINESS',
  'Link (Open Graph tag)': 'LINK',
  '(Link)': 'LINK',
  '(Card)': 'CARD',
  'Overlay (alternativo)': 'OVERLAY2',
  'Display ad 1': 'DISPLAY1',
  'Display ad 2': 'DISPLAY2',
  'Figurinha (Sticker)': 'STICKER',
  'Story / Reels': 'STORY',
  'Thumbnail — 2:3': 'THUMB',
  'Thumbnail — 1:1': 'THUMB',
  'For You': 'FORYOU',
  'Leaderboard': 'LEADER',
  'Banner iFood': 'BANNER',
  'Retangular': 'RETANG',
  'Journey Ad · Dispatch (Pedido)': 'DISPATCH',
  'Journey Ad · En-Route (No trajeto)': 'ENROUTE',
  'Journey Ad · On-Trip (Em viagem)': 'ONTRIP',
  'JourneyTV · Exibição estática': 'JTVESTATICO',
  'JourneyTV · Send to Phone (e-mail)': 'JTVEMAIL'
};

/** Tira acento, pontuação e espaço, e sobe para maiúsculas. */
function slug(txt) {
  return (txt || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

// Quadrado, Retrato e Paisagem são a mesma coisa: peça de feed. O que as separa
// é a dimensão, não o nome, então viram FEED e o desempate resolve.
// Vale só nas redes sociais. No Google Ads esses mesmos nomes descrevem display
// ad, que não é feed, e lá o nome do formato é mantido.
const NOMES_DE_FEED = ['Quadrado', 'Retrato', 'Paisagem'];
const PLATAFORMAS_SEM_FEED = ['google_ads'];

/** Abreviação de um formato, sem considerar colisão. */
function formatAbbr(fmt) {
  if (!fmt) return '';

  if (NOMES_DE_FEED.indexOf(fmt.name) !== -1) {
    return PLATAFORMAS_SEM_FEED.indexOf(getActiveDatabaseKey()) === -1
      ? 'FEED'
      : slug(fmt.name).slice(0, 12);
  }

  if (FORMAT_ABBR[fmt.name]) return FORMAT_ABBR[fmt.name];
  // Pega só o primeiro trecho antes de um separador ("Perfil / Destaques")
  const base = String(fmt.name).split(/[\/·—–]/)[0];
  return slug(base).slice(0, 12) || slug(fmt.id).slice(0, 12);
}

/**
 * Token de formato que entra no nome do arquivo.
 *
 * Não desempata por dimensão. As seis peças de feed do Instagram saem todas
 * como FEED, e o mesmo vale para as duas capas do Facebook e as duas
 * thumbnails do WhatsApp. É de propósito: cada clique gera um documento só, e
 * quem cria renomeia na hora de salvar. Nome curto vale mais que nome único.
 */
function formatToken(fmt) {
  return formatAbbr(fmt);
}

// Ordem em que as peças aparecem na lista. Segue o uso, não o alfabeto.
const ORDEM_DE_USO = ['FEED', 'STORY', 'REELS', 'PERFIL'];

// Dentro do grupo de feed, a proporção manda: 4:5 primeiro, que é a peça mais
// usada. Ordenar por área punha o 3:4 na frente do 4:5 só por ser mais alto.
const ORDEM_PROPORCAO = ['4:5', '1:1', '3:4', '1.91:1', '16:9', '4:3', '5:4'];

// Nomes que são peça de feed mesmo onde a abreviação não vira FEED (Google Ads).
const NOMES_FEED_PARA_ORDEM = ['Quadrado', 'Retrato', 'Paisagem', 'Feed', 'Carrossel'];

/** Posição do formato na ordem de uso. Quanto menor, mais no topo da lista. */
function ordemDeUso(fmt) {
  const abbr = formatAbbr(fmt);
  const i = ORDEM_DE_USO.indexOf(abbr);
  if (i !== -1) return i;
  if (NOMES_FEED_PARA_ORDEM.indexOf(fmt.name) !== -1) return 0;
  if (abbr === 'STATUS') return 1;   // Status do WhatsApp é o story dele
  if (abbr === 'FORYOU') return 2;   // For You do TikTok é o reels dele
  return ORDEM_DE_USO.length;        // o resto vai para o fim
}

/* ---------------------------------------------------------------------------
   Preferências: o painel reabre na última escolha da pessoa.
   Guarda plataforma, modo, formato e cor de tema. NÃO guarda a quantidade —
   reabrir pedindo 5 pranchetas por engano é pior que redigitar o número.
   --------------------------------------------------------------------------- */

const PREFS_CHAVE = 'esquadro.prefs.v1';

/** Formato que populateFormats deve tentar selecionar antes de cair no primeiro. */
let formatoDesejado = null;

/** Lê as preferências. Devolve objeto vazio se não houver ou se falhar. */
function lerPrefs() {
  try {
    const bruto = localStorage.getItem(PREFS_CHAVE);
    return bruto ? (JSON.parse(bruto) || {}) : {};
  } catch (e) {
    // localStorage pode não existir no UXP dependendo da versão; sem ele o
    // painel só perde a memória, não quebra.
    console.log('[ESQUADRO] preferências indisponíveis: ' + (e && e.message));
    return {};
  }
}

function salvarPrefs() {
  try {
    localStorage.setItem(PREFS_CHAVE, JSON.stringify({
      plataforma: currentPlatform,
      modo: currentMode,
      formato: selectedFormatId,
      cor: themeColor
    }));
  } catch (e) {
    /* sem memória disponível: segue sem persistir */
  }
}

/** DDMM da data de hoje. */
function todayDDMM() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}${mes}`;
}

/**
 * Nome base do documento: #TAREFA_PLATAFORMA_FORMATO_DDMM
 * Ex.: #TAREFA_IG_STORY_2508
 *
 * O "#TAREFA" é literal e igual para todos — quem cria renomeia na hora de
 * salvar, com o número do RunRunIt.
 */
// "TAЯEFA" com o R virado, referenciando a marca. É o caractere cirílico Я
// (U+042F), não um R rotacionado: em nome de arquivo não há CSS para espelhar.
const MARCADOR_TAREFA = '#TA\u042FEFA';

function buildDocName() {
  const plat = PLATFORM_ABBR[getActiveDatabaseKey()] || currentPlatform.toUpperCase();
  const fmt = formatToken(getSelectedFormat());
  const partes = [MARCADOR_TAREFA, plat, fmt, todayDDMM()].filter(Boolean);
  return partes.join('_');
}

// Cores da paleta claras o bastante para exigir texto escuro por cima.
// Precisa cobrir toda a paleta de .theme-palette no index.html.
const LIGHT_THEME_COLORS = ['#a2d2eb', '#fea8fe', '#e5e3d9', '#c5c0b6'];

const DEFAULT_THEME_COLOR = '#E61C00';

/** Cor de texto legível sobre a cor de tema informada. */
function contrastOn(color) {
  return LIGHT_THEME_COLORS.includes((color || '').toLowerCase()) ? '#222222' : '#ffffff';
}

// Última cor de tema escolhida. Guardada em JS porque o suporte do UXP a
// getComputedStyle sobre variável CSS é irregular — ler da raiz é só o palpite
// inicial, e uma exceção aqui derrubaria o init() inteiro.
let themeColor = null;

/** Cor de tema atualmente aplicada. */
function currentThemeColor() {
  if (themeColor) return themeColor;
  try {
    const fromRoot = getComputedStyle(document.documentElement)
      .getPropertyValue('--vermelho-raro')
      .trim();
    if (fromRoot) return fromRoot;
  } catch (e) {
    console.log('[ESQUADRO] getComputedStyle indisponível, usando cor padrão.');
  }
  return DEFAULT_THEME_COLOR;
}

function init(config) {
  platformsData = config.data;
  createCallback = config.onCreateArtboards;
  guidesCallback = config.onApplyGuides;

  // Cache de elementos do DOM
  els.floatingTooltip = document.getElementById('floatingTooltip');
  els.extendedStrip = document.getElementById('extendedStrip');
  els.btnToggleStrip = document.getElementById('btnToggleStrip');
  
  // Custom Dropdown
  els.customDropdown = document.getElementById('customDropdown');
  els.dropdownTrigger = document.getElementById('dropdownTrigger');
  els.dropdownCurrentLabel = document.getElementById('dropdownCurrentLabel');
  els.dropdownCurrentDim = document.getElementById('dropdownCurrentDim');
  els.dropdownMenu = document.getElementById('dropdownMenu');
  
  els.qtdInput = document.getElementById('qtdInput');
  els.btnMinus = document.getElementById('btnMinus');
  els.btnPlus = document.getElementById('btnPlus');
  els.btnActionLabel = document.getElementById('btnActionLabel');
  els.canvasPreview = document.getElementById('canvasPreview');
  els.safeOverlay = document.getElementById('safeOverlay');
  els.noInfoBox = document.getElementById('noInfoBox');
  els.cropOverlay = document.getElementById('cropOverlay');
  els.dimText = document.getElementById('dimText');
  els.cropNoteText = document.getElementById('cropNoteText');
  els.legendSafeItem = document.getElementById('legendSafeItem');
  els.legendCropItem = document.getElementById('legendCropItem');
  els.btnCreate = document.getElementById('btnCreate');
  els.btnGuidesOnly = document.getElementById('btnGuidesOnly');
  els.toast = document.getElementById('toast');

  els.modeOrganic = document.getElementById('modeOrganic');
  els.modeAds = document.getElementById('modeAds');

  bindEvents();

  // Restaura a última escolha antes de montar a lista, para o formato salvo
  // já ser o selecionado em vez de piscar no primeiro da lista.
  const prefs = lerPrefs();
  if (prefs.cor) applyTheme(prefs.cor);
  if (prefs.modo === 'organic' || prefs.modo === 'ads') currentMode = prefs.modo;
  formatoDesejado = prefs.formato || null;

  const plataformaValida = prefs.plataforma &&
    document.querySelector(`.platform-icon[data-platform="${prefs.plataforma}"]`);

  selectPlatform(plataformaValida ? prefs.plataforma : currentPlatform);
  updateQtdLabel();
}

function bindEvents() {
  // Clique e Tooltip nos ícones de redes
  const allIcons = document.querySelectorAll('.platform-icon');
  allIcons.forEach(icon => {
    const plat = icon.getAttribute('data-platform');
    const tooltipText = icon.getAttribute('data-tooltip') || platformNames[plat] || plat;

    // Clique para selecionar (exceto o botão de expandir)
    if (!icon.classList.contains('btn-toggle-strip')) {
      icon.addEventListener('click', () => {
        selectPlatform(plat);
      });
    }

    // Tooltip flutuante ao passar o mouse.
    // Em try/catch porque getBoundingClientRect no UXP pode não devolver
    // posição utilizável — tooltip é enfeite, não pode derrubar o painel.
    icon.addEventListener('mouseenter', (e) => {
      if (!tooltipText) return;
      let rect;
      try {
        rect = icon.getBoundingClientRect();
      } catch (err) {
        return;
      }
      if (!rect) return;
      els.floatingTooltip.textContent = tooltipText;
      els.floatingTooltip.style.left = `${rect.left + rect.width / 2}px`;
      els.floatingTooltip.style.top = `${rect.top}px`;
      els.floatingTooltip.classList.add('visible');
    });

    icon.addEventListener('mouseleave', () => {
      els.floatingTooltip.classList.remove('visible');
    });
  });

  // Botão para abrir/fechar a segunda fileira de plataformas.
  // O ícone fechado ("...") vem do index.html e é guardado aqui: assim o
  // desenho mora num lugar só, e recolher a fileira não o troca por outro.
  const iconeAbrir = els.btnToggleStrip.innerHTML;
  const iconeFechar = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13H5v-2h14v2z"/></svg>';

  els.btnToggleStrip.addEventListener('click', () => {
    const isExpanded = els.extendedStrip.style.display === 'flex';
    if (isExpanded) {
      els.extendedStrip.style.display = 'none';
      els.btnToggleStrip.classList.remove('active');
      els.btnToggleStrip.setAttribute('data-tooltip', 'Mais Plataformas');
      els.btnToggleStrip.innerHTML = iconeAbrir;
    } else {
      els.extendedStrip.style.display = 'flex';
      els.btnToggleStrip.classList.add('active');
      els.btnToggleStrip.setAttribute('data-tooltip', 'Menos Plataformas');
      els.btnToggleStrip.innerHTML = iconeFechar;
    }
  });

  // Mudança de modo (Orgânico vs Ads)
  els.modeOrganic.addEventListener('click', () => {
    if (modeLocked && modeLocked !== 'organic') return;
    selectMode('organic');
  });
  els.modeAds.addEventListener('click', () => {
    if (modeLocked && modeLocked !== 'ads') return;
    selectMode('ads');
  });

  // Toggle do Dropdown Customizado
  els.dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    els.customDropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!els.customDropdown.contains(e.target)) {
      els.customDropdown.classList.remove('open');
    }
  });
  
  els.btnMinus.addEventListener('click', () => {
    let q = parseInt(els.qtdInput.textContent) || 1;
    if (q > 1) {
      els.qtdInput.textContent = q - 1;
      updateQtdLabel();
    }
  });

  els.btnPlus.addEventListener('click', () => {
    let q = parseInt(els.qtdInput.textContent) || 1;
    if (q < 20) {
      els.qtdInput.textContent = q + 1;
      updateQtdLabel();
    }
  });

  els.btnCreate.addEventListener('click', async () => {
    if (!actionsEnabled) return;
    const fmt = getSelectedFormat();
    if (!fmt) {
      showToast('Nenhum formato disponível para esta plataforma.', 'error');
      return;
    }
    const count = parseInt(els.qtdInput.textContent) || 1;
    if (!createCallback) return;

    const docName = buildDocName();
    // Sem toast de confirmação: o resultado aparece no próprio documento.
    // Só falha gera mensagem.
    await runAction(() => createCallback(fmt, count, docName));
  });

  els.btnGuidesOnly.addEventListener('click', async () => {
    if (!actionsEnabled) return;
    const fmt = getSelectedFormat();
    if (!fmt) {
      showToast('Nenhum formato disponível para esta plataforma.', 'error');
      return;
    }
    if (!guidesCallback) return;

    await runAction(() => guidesCallback(fmt));
  });

  // Paleta de Cores Dinâmica (Theme Switcher Rápido)
  const colorDots = document.querySelectorAll('.color-dot');
  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const color = dot.getAttribute('data-color');
      applyTheme(color);
    });
  });
}

function applyTheme(color) {
  if (!color) return;

  document.querySelectorAll('.color-dot').forEach(d => {
    const igual = (d.getAttribute('data-color') || '').toLowerCase() === color.toLowerCase();
    d.classList.toggle('active', igual);
  });

  // Só duas variáveis na raiz, e o CSS resolve o resto. Antes daqui saíam 26
  // escritas de estilo inline em badge, botões e ícones — e estilo inline ganha
  // de qualquer regra de CSS, então cada ajuste no styles.css era desfeito no
  // primeiro clique.
  themeColor = color;

  // O acento em TRAÇO pode diferir da cor cheia: o Vinho Raro dá 1.02:1 sobre o
  // painel escuro e desaparece. A bolinha declara o seu em data-acento.
  const escolhida = document.querySelector(`.color-dot[data-color="${color}"]`);
  const acento = (escolhida && escolhida.getAttribute('data-acento')) || color;
  // a companheira do par: guia de corte, modo ativo, ícone ativo e wordmark
  const par = (escolhida && escolhida.getAttribute('data-par')) || null;

  const raiz = document.documentElement.style;
  raiz.setProperty('--vermelho-raro', color);
  raiz.setProperty('--acento-visivel', acento);
  raiz.setProperty('--guide-safe', acento);
  raiz.setProperty('--sobre-acento', contrastOn(color));
  if (par) {
    raiz.setProperty('--companheira', par);
    raiz.setProperty('--guide-crop', par);
    raiz.setProperty('--sobre-companheira', contrastOn(par));
  }

  updatePreview();
  salvarPrefs();
}


function selectPlatform(plat) {
  currentPlatform = plat;

  document.querySelectorAll('.platform-icon:not(.btn-toggle-strip)').forEach(icon => {
    icon.classList.toggle('active', icon.getAttribute('data-platform') === plat);
  });

  // adjustModeForPlatform termina em selectMode, que já chama populateFormats.
  // Chamar de novo aqui remontava a lista e descartava o formato restaurado.
  adjustModeForPlatform();
  salvarPrefs();
}


function selectMode(mode) {
  currentMode = mode;
  els.modeOrganic.classList.toggle('active', mode === 'organic');
  els.modeAds.classList.toggle('active', mode !== 'organic');
  populateFormats();
}


function adjustModeForPlatform() {
  const plat = currentPlatform;
  
  const onlyAds = ['google_ads', 'meta_ads', 'uber', 'ifood'];

  // Sem seção de mídia paga no Guia de Formatos: varri as 87 páginas do deck e
  // não há menção de Ads nas faixas de LinkedIn (15-22), TikTok (53-57) e
  // WhatsApp (58-64). Com o botão livre, ele trocava de cor e a lista de
  // formatos continuava idêntica.
  // X saiu daqui: as páginas 34 e 35 são de anúncio, agora em twitter_ads.
  const onlyOrganic = ['linkedin', 'tiktok', 'whatsapp', 'ooh'];

  // Habilita ambos por padrão
  els.modeOrganic.classList.remove('is-disabled');
  els.modeAds.classList.remove('is-disabled');
  modeLocked = null;

  if (onlyAds.includes(plat)) {
    currentMode = 'ads';
    modeLocked = 'ads';
    els.modeOrganic.classList.add('is-disabled');
  } else if (onlyOrganic.includes(plat)) {
    currentMode = 'organic';
    modeLocked = 'organic';
    els.modeAds.classList.add('is-disabled');
  } else if (!currentMode) {
    currentMode = 'organic';
  }

  selectMode(currentMode);
}

function getActiveDatabaseKey() {
  let plat = currentPlatform;
  
  // Conversão inteligente baseada no Modo (Orgânico vs Ads)
  if (currentMode === 'ads') {
    if (plat === 'facebook') return 'facebook_ads';
    if (plat === 'youtube') return 'youtube_ads';
    if (plat === 'instagram') return 'meta_ads';
    if (plat === 'twitter') return 'twitter_ads';
    return plat;
  } else {
    if (plat === 'facebook_ads') return 'facebook';
    if (plat === 'youtube_ads') return 'youtube';
    if (plat === 'meta_ads') return 'instagram';
    if (plat === 'twitter_ads') return 'twitter';
    return plat;
  }
}

let selectedFormatId = null;
let actionsEnabled = true;

/** Liga/desliga os dois botões de ação (usado quando não há formato válido). */
function setActionsEnabled(enabled) {
  actionsEnabled = enabled;
  [els.btnCreate, els.btnGuidesOnly].forEach(btn => {
    if (!btn) return;
    if (enabled) btn.classList.remove('is-disabled');
    else btn.classList.add('is-disabled');
  });
}

function getSelectedFormat() {
  const dbKey = getActiveDatabaseKey();
  const platform = platformsData[dbKey] || {};
  const formats = platform.formats || [];
  return formats.find(f => f.id === selectedFormatId) || formats[0];
}

function selectFormat(fmtId) {
  selectedFormatId = fmtId;
  const fmt = getSelectedFormat();
  if (fmt) {
    els.dropdownCurrentLabel.textContent = fmt.name;
    if (els.dropdownCurrentDim) {
      els.dropdownCurrentDim.textContent = `${fmt.width}×${fmt.height}`;
    }
  }
  
  // Atualiza classe active nos itens do menu
  const items = els.dropdownMenu.querySelectorAll('.custom-dropdown-item');
  items.forEach(item => {
    if (item.getAttribute('data-id') === fmtId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  els.customDropdown.classList.remove('open');
  updatePreview();
  salvarPrefs();
}

function populateFormats() {
  const dbKey = getActiveDatabaseKey();
  const platform = platformsData[dbKey] || {};
  let formats = platform.formats || [];
  
  // Ordem de uso, não alfabética: feed primeiro, depois story, reels e perfil.
  formats = [...formats].sort((a, b) => {
    const ra = ordemDeUso(a), rb = ordemDeUso(b);
    if (ra !== rb) return ra - rb;

    // dentro do grupo, a proporção mais usada primeiro
    const pa = ORDEM_PROPORCAO.indexOf(a.ratio);
    const pb = ORDEM_PROPORCAO.indexOf(b.ratio);
    const ia = pa === -1 ? ORDEM_PROPORCAO.length : pa;
    const ib = pb === -1 ? ORDEM_PROPORCAO.length : pb;
    if (ia !== ib) return ia - ib;

    // proporção igual ou fora da lista: maior área primeiro
    const areaA = (a.width || 0) * (a.height || 0);
    const areaB = (b.width || 0) * (b.height || 0);
    if (areaA !== areaB) return areaB - areaA;
    return a.name.localeCompare(b.name);
  });
  
  els.dropdownMenu.innerHTML = '';

  if (formats.length === 0) {
    els.dropdownCurrentLabel.textContent = 'Sem formatos disponíveis';
    if (els.dropdownCurrentDim) els.dropdownCurrentDim.textContent = '';
    selectedFormatId = null;
    els.customDropdown.classList.remove('open');
    setActionsEnabled(false);
    updatePreview(); // limpa o preview em vez de deixar o formato anterior na tela
  } else {
    setActionsEnabled(true);
    formats.forEach(fmt => {
      const item = document.createElement('div');
      item.className = 'custom-dropdown-item';
      item.setAttribute('data-id', fmt.id);
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = fmt.name;
      
      const dimSpan = document.createElement('span');
      dimSpan.className = 'fmt-dim';
      dimSpan.textContent = `${fmt.width}×${fmt.height}`;

      item.appendChild(nameSpan);
      item.appendChild(dimSpan);

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFormat(fmt.id);
      });

      els.dropdownMenu.appendChild(item);
    });
    
    // Prefere o formato salvo, se ele existir nesta plataforma. O desejo vale
    // uma vez: depois disso, trocar de plataforma volta a abrir no primeiro.
    const salvo = formatoDesejado && formats.some(f => f.id === formatoDesejado)
      ? formatoDesejado
      : formats[0].id;
    formatoDesejado = null;
    selectFormat(salvo);
  }
}

function updateQtdLabel() {
  let q = parseInt(els.qtdInput.textContent);
  if (isNaN(q) || q < 1) q = 1;
  els.qtdInput.textContent = q;
  els.btnActionLabel.textContent = q > 1 ? "Criar Pranchetas" : "Criar Prancheta";
  updatePreview();
}

/** Zera o preview quando não há formato selecionado. */
function clearPreview() {
  els.canvasPreview.style.width = '84px';
  els.canvasPreview.style.height = '84px';
  els.canvasPreview.style.borderRadius = '2px';
  els.canvasPreview.classList.add('is-empty');
  els.dimText.textContent = '—';
  els.safeOverlay.style.display = 'none';
  els.noInfoBox.style.display = 'none';
  els.cropOverlay.style.display = 'none';
  els.legendSafeItem.style.display = 'none';
  els.legendCropItem.style.display = 'none';
  els.cropNoteText.style.display = 'none';
}

function updatePreview() {
  const fmt = getSelectedFormat();
  if (!fmt) {
    clearPreview();
    return;
  }
  els.canvasPreview.classList.remove('is-empty');

  const q = parseInt(els.qtdInput.textContent) || 1;
  const maxW = 84;
  const maxH = 108;
  const ratio = fmt.width / fmt.height;

  let renderW, renderH;
  if (ratio > maxW / maxH) {
    renderW = maxW;
    renderH = maxW / ratio;
  } else {
    renderH = maxH;
    renderW = maxH * ratio;
  }

  els.canvasPreview.style.width = `${renderW}px`;
  els.canvasPreview.style.height = `${renderH}px`;
  els.canvasPreview.style.borderRadius = fmt.circular ? '50%' : '2px';
  els.dimText.textContent = `${fmt.width} × ${fmt.height} px`;

  const scaleX = renderW / fmt.width;
  const scaleY = renderH / fmt.height;

  // Safe Zone
  if (fmt.safe) {
    els.legendSafeItem.style.display = 'flex';
    els.safeOverlay.style.display = 'block';
    els.safeOverlay.style.top = `${(fmt.safe.top || 0) * scaleY}px`;
    els.safeOverlay.style.bottom = `${(fmt.safe.bottom || 0) * scaleY}px`;
    els.safeOverlay.style.left = `${(fmt.safe.left || 0) * scaleX}px`;
    els.safeOverlay.style.right = `${(fmt.safe.right || 0) * scaleX}px`;
    els.safeOverlay.style.borderRadius = fmt.circular ? '50%' : '0';
  } else {
    els.legendSafeItem.style.display = 'none';
    els.safeOverlay.style.display = 'none';
  }

  // No Info Box — ancorado na safe zone quando ela existe, senão na borda
  if (fmt.noInfoBox) {
    const safeBottom = fmt.safe ? fmt.safe.bottom : 0;
    const safeLeft = fmt.safe ? fmt.safe.left : 0;
    const safeRight = fmt.safe ? fmt.safe.right : 0;

    els.noInfoBox.style.display = 'block';
    els.noInfoBox.style.width = `${fmt.noInfoBox.width * scaleX}px`;
    els.noInfoBox.style.height = `${fmt.noInfoBox.height * scaleY}px`;
    els.noInfoBox.style.bottom = `${safeBottom * scaleY}px`;

    if (fmt.noInfoBox.anchor === 'bottom-left') {
      els.noInfoBox.style.left = `${safeLeft * scaleX}px`;
      els.noInfoBox.style.right = 'auto';
    } else {
      els.noInfoBox.style.right = `${safeRight * scaleX}px`;
      els.noInfoBox.style.left = 'auto';
    }
  } else {
    els.noInfoBox.style.display = 'none';
  }

  // Linhas de corte — `crop.lateral` é o recuo simétrico nas laterais;
  // `crop.top` / `crop.bottom` são opcionais para corte vertical.
  if (fmt.crop) {
    els.legendCropItem.style.display = 'flex';
    els.cropOverlay.style.display = 'block';

    const cropTextEl = els.legendCropItem.querySelector('span');
    if (cropTextEl) {
      cropTextEl.textContent = fmt.cropName || 'Linhas de Corte';
    }

    const lateral = fmt.crop.lateral || 0;
    els.cropOverlay.style.left = `${lateral * scaleX}px`;
    els.cropOverlay.style.right = `${lateral * scaleX}px`;
    els.cropOverlay.style.top = `${(fmt.crop.top || 0) * scaleY}px`;
    els.cropOverlay.style.bottom = `${(fmt.crop.bottom || 0) * scaleY}px`;

    els.cropNoteText.style.display = q > 1 ? 'block' : 'none';
  } else {
    els.legendCropItem.style.display = 'none';
    els.cropOverlay.style.display = 'none';
    els.cropNoteText.style.display = 'none';
  }
}

/**
 * Executa uma ação do Photoshop. Só avisa quando dá errado — sucesso é visível
 * no documento e não precisa de confirmação na tela.
 */
async function runAction(fn) {
  try {
    const result = await fn();
    if (result && result.ok === false) {
      showToast(result.message || 'Não foi possível concluir a ação.', 'error');
    }
  } catch (err) {
    console.error('[ESQUADRO] Falha na ação:', err);
    showToast(`Erro: ${err && err.message ? err.message : err}`, 'error');
  }
}

let toastTimer = null;

/** type: 'success' (padrão) | 'error' | 'info' */
function showToast(msg, type) {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  els.toast.textContent = msg;
  els.toast.classList.remove('is-error', 'is-info');
  if (type === 'error') els.toast.classList.add('is-error');
  else if (type === 'info') els.toast.classList.add('is-info');

  els.toast.style.display = 'block';

  // 'info' marca operação em andamento: fica na tela até o resultado chegar.
  if (type === 'info') return;

  toastTimer = setTimeout(() => {
    els.toast.style.display = 'none';
    toastTimer = null;
  }, 3500);
}

module.exports = {
  init
};
