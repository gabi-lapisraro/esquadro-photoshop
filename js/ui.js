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
  'uber': 'Uber',
  'ifood': 'iFood',
  'ooh': 'OOH'
};

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
  selectPlatform(currentPlatform);
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

  // Botão + / - para expandir/recolher
  els.btnToggleStrip.addEventListener('click', () => {
    const isExpanded = els.extendedStrip.style.display === 'flex';
    if (isExpanded) {
      els.extendedStrip.style.display = 'none';
      els.btnToggleStrip.classList.remove('active');
      els.btnToggleStrip.setAttribute('data-tooltip', 'Mais Plataformas');
      els.btnToggleStrip.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>';
    } else {
      els.extendedStrip.style.display = 'flex';
      els.btnToggleStrip.classList.add('active');
      els.btnToggleStrip.setAttribute('data-tooltip', 'Menos Plataformas');
      els.btnToggleStrip.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13H5v-2h14v2z"/></svg>';
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

    showToast(`Criando ${count} prancheta(s)...`, 'info');
    await runAction(() => createCallback(fmt, count),
      `${count} prancheta(s) criada(s).`);
  });

  els.btnGuidesOnly.addEventListener('click', async () => {
    if (!actionsEnabled) return;
    const fmt = getSelectedFormat();
    if (!fmt) {
      showToast('Nenhum formato disponível para esta plataforma.', 'error');
      return;
    }
    if (!guidesCallback) return;

    await runAction(() => guidesCallback(fmt), 'Guias aplicadas.');
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

  // Atualiza active nos dots
  const colorDots = document.querySelectorAll('.color-dot');
  colorDots.forEach(d => {
    if (d.getAttribute('data-color').toLowerCase() === color.toLowerCase()) {
      d.classList.add('active');
    } else {
      d.classList.remove('active');
    }
  });

  // Aplica as variáveis no CSS root (atualiza tudo que depende da cor da marca)
  themeColor = color;
  document.documentElement.style.setProperty('--vermelho-raro', color);
  document.documentElement.style.setProperty('--guide-safe', color);

  const textColor = contrastOn(color);

  // Atualiza badge de Lápis Raro
  const badge = document.querySelector('.badge-lr');
  if (badge) {
    badge.style.backgroundColor = color;
    badge.style.color = textColor;
  }

  // Atualiza botão primário
  if (els.btnCreate) {
    els.btnCreate.style.backgroundColor = color;
    els.btnCreate.style.color = textColor;
  }

  // Atualiza botões de modo
  if (els.modeOrganic) {
    if (els.modeOrganic.classList.contains('active')) {
      els.modeOrganic.style.backgroundColor = color;
      els.modeOrganic.style.color = textColor;
    } else {
      els.modeOrganic.style.backgroundColor = 'transparent';
      els.modeOrganic.style.color = 'var(--text-muted)';
    }
  }

  if (els.modeAds) {
    if (els.modeAds.classList.contains('active')) {
      els.modeAds.style.backgroundColor = color;
      els.modeAds.style.color = textColor;
    } else {
      els.modeAds.style.backgroundColor = 'transparent';
      els.modeAds.style.color = 'var(--text-muted)';
    }
  }

  // Atualiza ícone ativo da plataforma
  const activeIcon = document.querySelector('.platform-icon.active');
  if (activeIcon) {
    activeIcon.style.color = color;
  }

  // Atualiza botão toggle de mais plataformas se ativo
  if (els.btnToggleStrip && els.btnToggleStrip.classList.contains('active')) {
    els.btnToggleStrip.style.color = color;
  }

  // Atualiza legenda de safe zone
  const dotSafe = document.querySelector('.dot-safe');
  if (dotSafe) dotSafe.style.backgroundColor = color;

  // Atualiza preview de guias
  updatePreview();
}

function selectPlatform(plat) {
  currentPlatform = plat;

  // Atualiza classes ativas nos ícones
  const themeColor = currentThemeColor();
  const icons = document.querySelectorAll('.platform-icon:not(.btn-toggle-strip)');
  icons.forEach(icon => {
    if (icon.getAttribute('data-platform') === plat) {
      icon.classList.add('active');
      icon.style.color = themeColor;
    } else {
      icon.classList.remove('active');
      icon.style.color = 'var(--text-muted)';
    }
  });

  adjustModeForPlatform();
  populateFormats();
}

function selectMode(mode) {
  currentMode = mode;
  const themeColor = currentThemeColor();
  const textColor = contrastOn(themeColor);

  if (mode === 'organic') {
    els.modeOrganic.classList.add('active');
    els.modeOrganic.style.backgroundColor = themeColor;
    els.modeOrganic.style.color = textColor;
    els.modeAds.classList.remove('active');
    els.modeAds.style.backgroundColor = 'transparent';
    els.modeAds.style.color = 'var(--text-muted)';
  } else {
    els.modeAds.classList.add('active');
    els.modeAds.style.backgroundColor = themeColor;
    els.modeAds.style.color = textColor;
    els.modeOrganic.classList.remove('active');
    els.modeOrganic.style.backgroundColor = 'transparent';
    els.modeOrganic.style.color = 'var(--text-muted)';
  }

  populateFormats();
}

function adjustModeForPlatform() {
  const plat = currentPlatform;
  
  const onlyAds = ['google_ads', 'meta_ads', 'uber', 'ifood'];
  const onlyOrganic = ['twitter', 'ooh'];

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
    return plat;
  } else {
    if (plat === 'facebook_ads') return 'facebook';
    if (plat === 'youtube_ads') return 'youtube';
    if (plat === 'meta_ads') return 'instagram';
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
    els.dropdownCurrentLabel.textContent = `${fmt.name} ${fmt.width}×${fmt.height}`;
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
}

function populateFormats() {
  const dbKey = getActiveDatabaseKey();
  const platform = platformsData[dbKey] || {};
  let formats = platform.formats || [];
  
  // Ordena os formatos alfabeticamente
  formats = [...formats].sort((a, b) => a.name.localeCompare(b.name));
  
  els.dropdownMenu.innerHTML = '';

  if (formats.length === 0) {
    els.dropdownCurrentLabel.textContent = 'Sem formatos disponíveis';
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
      dimSpan.style.fontSize = '9px';
      dimSpan.style.opacity = '0.7';
      dimSpan.textContent = `${fmt.width}×${fmt.height}`;

      item.appendChild(nameSpan);
      item.appendChild(dimSpan);

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFormat(fmt.id);
      });

      els.dropdownMenu.appendChild(item);
    });
    
    // Auto-seleciona o primeiro
    selectFormat(formats[0].id);
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
 * Executa uma ação do Photoshop e reporta o resultado real no toast.
 * A ação deve resolver para { ok, message }; qualquer throw é capturado aqui.
 */
async function runAction(fn, successMsg) {
  try {
    const result = await fn();
    if (result && result.ok === false) {
      showToast(result.message || 'Não foi possível concluir a ação.', 'error');
      return;
    }
    showToast((result && result.message) || successMsg);
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
