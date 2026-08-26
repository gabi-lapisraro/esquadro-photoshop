// Guarda o redesenho: as duas molduras com recorte em Я, e os três detalhes
// que vieram junto (pílulas, seletor sem seta, "..." no lugar do "+").
//
// Aqui é só ESTRUTURA. O jsdom não faz layout e não busca o styles.css, então
// quem confere se o traço da ponta encosta no miolo é o `gerar-molduras.py
// --verificar`, comparando código e desenho; e o olho, no playground.
const path = require('path');
const { boot, check, failCount, ROOT } = require(path.join(__dirname, 'harness.js'));
const { masterPlatforms } = require(path.join(ROOT, 'js/data_photoshop.js'));

const a = boot(masterPlatforms, {
  onCreateArtboards: () => ({ ok: true, message: 'ok' }),
  onApplyGuides: () => ({ ok: true, message: 'ok' })
});

console.log('\n=== A. as duas molduras estão montadas ===');
for (const nome of ['topo', 'base']) {
  const m = document.querySelector('.moldura-' + nome);
  check(`moldura ${nome} existe`, !!m, true);
  if (!m) continue;
  const filhos = [...m.children].map(e => e.tagName.toLowerCase() + '.' + e.getAttribute('class').split(' ').pop());
  // ponta, miolo, ponta — nessa ordem: é o que faz o miolo esticar sozinho
  check(`moldura ${nome} em três fatias`, filhos.join(' | '),
        `svg.ponta-${nome}-esq | div.moldura-meio | svg.ponta-${nome}-dir`);
  for (const lado of ['esq', 'dir']) {
    const p = m.querySelector(`.ponta-${nome}-${lado}`);
    check(`ponta ${nome}-${lado} tem viewBox`, /^0 0 [\d.]+ [\d.]+$/.test(p.getAttribute('viewBox')), true);
    const d = p.querySelector('path');
    check(`ponta ${nome}-${lado} desenha traço, não preenchimento`,
          `${d.getAttribute('fill')}/${d.getAttribute('stroke')}`, 'none/currentColor');
    check(`ponta ${nome}-${lado} tem caminho`, d.getAttribute('d').length > 40, true);
  }
}

console.log('\n=== B. o conteúdo foi para dentro das molduras ===');
check('ESQUADЯO no miolo de cima',
      !!document.querySelector('.moldura-topo .moldura-meio .header-logo'), true);
check('assinatura no miolo de baixo',
      !!document.querySelector('.moldura-base .moldura-meio .assinatura'), true);
check('wordmark na assinatura',
      !!document.querySelector('.assinatura .header-wordmark'), true);
check('bolinhas de cor na assinatura',
      !!document.querySelector('.assinatura #themePalette'), true);
check('o cabeçalho antigo não existe mais',
      !!document.querySelector('.panel-header'), false);

console.log('\n=== C. seletor de formato: sem seta ===');
check('nenhuma seta no gatilho', !!document.querySelector('.dropdown-arrow'), false);
check('o nome continua sendo escrito', a.$('dropdownCurrentLabel').textContent.length > 2, true);

console.log('\n=== D. "..." abre a segunda fileira e volta como "..." ===');
const b = a.$('btnToggleStrip');
const fechado = b.innerHTML;
check('fechado desenha três bolinhas', (fechado.match(/<circle/g) || []).length, 3);
a.click(b);
check('abriu a fileira', a.$('extendedStrip').style.display, 'flex');
check('aberto vira um traço', b.innerHTML.includes('<circle'), false);
a.click(b);
check('fechou a fileira', a.$('extendedStrip').style.display, 'none');
check('e o ícone voltou o mesmo', b.innerHTML, fechado);

console.log('\n=== E. opacidade: ícone apagado, bolinha cheia ===');
// O harness não busca o styles.css do <link>, então aqui eu monto um DOM à
// parte com o CSS embutido — é a única forma de ler opacidade no jsdom.
{
  const fs = require('fs');
  const { JSDOM } = require(path.join(__dirname, 'node_modules/jsdom'));
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8')
                .replace(/@font-face \{[^}]*\}/g, '');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
                 .replace('<link rel="stylesheet" href="styles.css">', '<style>' + css + '</style>')
                 .replace(/<script[^>]*><\/script>/g, '');
  const w = new JSDOM(html).window;
  const op = sel => w.getComputedStyle(w.document.querySelector(sel)).opacity;

  check('ícone não selecionado fica em 20%', op('.platform-icon[data-platform="facebook"]'), '0.2');
  // o "..." não é plataforma: é o que avisa que há mais, e fica cheio
  check('o "..." fica cheio', op('#btnToggleStrip'), '1');
  // o índex já abre com o Instagram marcado
  check('ícone selecionado fica cheio', op('.platform-icon.active'), '1');

  // as bolinhas só podem diferir na cor de fundo: opacidade e traço iguais
  const dots = [...w.document.querySelectorAll('.color-dot')].map(d => {
    const cs = w.getComputedStyle(d);
    return cs.opacity + '/' + cs.borderStyle;
  });
  check('as 4 bolinhas ficam iguais', new Set(dots).size, 1);
  check('e todas cheias, sem traço', dots[0], '1/none');
}

const f = failCount();
console.log(`\n=== ${f === 0 ? 'TODOS OS TESTES PASSARAM' : f + ' FALHA(S)'} ===`);
process.exit(f === 0 ? 0 : 1);
