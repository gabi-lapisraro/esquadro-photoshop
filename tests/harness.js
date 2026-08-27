const path = require('path');
const fs = require('fs');
const { JSDOM } = require(path.join(__dirname, 'node_modules/jsdom'));
// Relativo ao próprio arquivo, e não cravado: a suíte precisa rodar na máquina
// de quem clona o repo. Caminho absoluto aqui fazia "funciona aqui" valer
// literalmente só aqui.
const ROOT = path.join(__dirname, '..');

// localStorage que sobrevive a vários boot(), modelando o painel reaberto na
// mesma máquina. O do jsdom morre com a janela e exige origem não-opaca.
const memoria = {};
const storage = {
  getItem: k => (k in memoria ? memoria[k] : null),
  setItem: (k, v) => { memoria[k] = String(v); },
  removeItem: k => { delete memoria[k]; },
  clear: () => { for (const k of Object.keys(memoria)) delete memoria[k]; }
};

let fails = 0;
function check(label, actual, expected) {
  const ok = String(actual) === String(expected);
  if (!ok) { fails++; console.log(`FAIL  ${label}\n      esperado=${expected}  obtido=${actual}`); }
  else console.log(`pass  ${label}`);
}
function failCount() { return fails; }

function boot(data, callbacks) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  global.window = dom.window;
  global.document = dom.window.document;
  global.getComputedStyle = dom.window.getComputedStyle;
  global.localStorage = storage;
  document.documentElement.style.setProperty('--vermelho-raro', '#E61C00');

  // require limpo para nao herdar o estado de modulo de outra execucao
  const uiPath = require.resolve(path.join(ROOT, 'js/ui.js'));
  delete require.cache[uiPath];
  const UI = require(uiPath);
  UI.init(Object.assign({ data }, callbacks));

  return {
    dom,
    $: id => document.getElementById(id),
    click: el => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
    pick: plat => document.querySelector(`.platform-icon[data-platform="${plat}"]`)
      .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
    items: () => [...document.getElementById('dropdownMenu').querySelectorAll('.custom-dropdown-item')]
  };
}
module.exports = { boot, check, failCount, ROOT, storage };
