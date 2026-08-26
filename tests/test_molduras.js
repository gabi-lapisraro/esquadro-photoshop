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

  // O recuo é na COR, não em `opacity`: o UXP ignora opacity, e no primeiro
  // teste no painel os seis ícones saíram todos cheios.
  const cor = sel => w.getComputedStyle(w.document.querySelector(sel)).color;
  check('ícone não selecionado recua na cor',
        cor('.platform-icon[data-platform="facebook"]'), 'rgba(229, 227, 217, 0.2)');
  // o "..." não é plataforma: é o que avisa que há mais, e fica cheio
  // o jsdom não resolve var() em `color`, então aqui basta: o "..." NÃO usa a
  // cor recuada dos ícones
  check('o "..." não fica recuado como os ícones',
        cor('#btnToggleStrip') === cor('.platform-icon[data-platform="facebook"]'), false);
  check('nada de ícone se escondendo por opacity',
        op('.platform-icon[data-platform="facebook"]'), '1');

  // as bolinhas só podem diferir na cor de fundo: opacidade e traço iguais
  const dots = [...w.document.querySelectorAll('.color-dot')].map(d => {
    const cs = w.getComputedStyle(d);
    return cs.opacity + '/' + cs.borderStyle;
  });
  check('as 4 bolinhas ficam iguais', new Set(dots).size, 1);
  check('e todas cheias, sem traço', dots[0], '1/none');
}

console.log('\n=== F. hover dos botões vai para a companheira ===');
{
  const fs = require('fs');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  // jsdom não computa :hover, então aqui eu leio a regra. Fraco de propósito:
  // o que ele pega é a regra ter sido apagada ou trocada sem querer.
  const regra = n => (css.match(new RegExp('\\.btn-' + n + ':hover\\s*\\{([^}]*)\\}')) || [,''])[1];
  const cheio = regra('primary'), vazado = regra('secondary');
  // o CHEIO se preenche com a companheira e a letra vai para o contraste dela
  check('o cheio se preenche com a companheira', /background-color:\s*var\(--companheira\)/.test(cheio), true);
  check('e a letra vai para o contraste dela', /color:\s*var\(--sobre-companheira\)/.test(cheio), true);
  // o VAZADO continua vazado: muda o traço e a letra, não o fundo
  check('o vazado não se preenche', /background-color:\s*transparent/.test(vazado), true);
  check('o traço dele vai para a companheira', /border-color:\s*var\(--companheira\)/.test(vazado), true);
  check('e a letra dele vai para a principal', /[^-]color:\s*var\(--acento-visivel\)/.test(vazado), true);
}

console.log('\n=== G. as duas guias saem da mesma cor ===');
{
  const fs = require('fs');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const borda = cls => ((css.match(new RegExp('\\.' + cls + '\\s*\\{([^}]*)\\}')) || [,''])[1]
                        .match(/border:[^;]*var\((--[\w-]+)\)/) || [,''])[1];
  // as três leem --companheira DIRETO: variável de guia à parte foi o que fez o
  // azul voltar sozinho no tema Vermelho, porque ela tinha padrão próprio
  check('área segura na companheira', borda('guide-overlay'), '--companheira');
  check('linha de corte na mesma', borda('guide-crop-overlay'), '--companheira');
  check('a caixa de reserva também', borda('guide-no-info'), '--companheira');
  check('não há variável de guia separada',
        /--guide-(safe|crop)\s*:/.test(css), false);
}

console.log('\n=== H0. a pílula do modo cobre o traço do trilho ===');
{
  const fs = require('fs');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8')
                .replace(/\/\*[\s\S]*?\*\//g, '');
  const btn = (css.match(/\.mode-btn\s*\{([^}]*)\}/) || [,''])[1];
  // altura CHEIA do trilho e avanço de uma borda para fora: com a altura do
  // miolo sobrava 1px de linha em volta, e a pílula parecia quebradiça
  check('a pílula tem a altura do trilho', /height:\s*var\(--alt-controle\)/.test(btn), true);
  check('e avança uma borda para cima', /margin-top:\s*calc\(var\(--borda\) \* -1px\)/.test(btn), true);
  check('e para baixo', /margin-bottom:\s*calc\(var\(--borda\) \* -1px\)/.test(btn), true);
  check('raio = metade da altura cheia',
        /border-radius:\s*calc\(var\(--alt-controle\) \/ 2\)/.test(btn), true);
  // as pontas por ID: seletor estrutural que falhasse no UXP deixaria a linha à
  // mostra sem nenhum aviso
  check('as pontas avançam por id', /#modeOrganic\s*\{[^}]*margin-left/.test(css) &&
        /#modeAds\s*\{[^}]*margin-right/.test(css), true);
}

console.log('\n=== H. a lista rola em vez de comprimir ===');
{
  const fs = require('fs');
  // sem os comentários: senão a palavra `max-height` DENTRO do comentário que
  // explica por que ele saiu conta como se ele ainda estivesse lá. É o mesmo
  // buraco que o verificar-uxp.py tinha com comentário de HTML.
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8')
                .replace(/\/\*[\s\S]*?\*\//g, '');
  const caixa = (css.match(/\.custom-dropdown-menu\s*\{([^}]*)\}/) || [,''])[1];
  const rola = (css.match(/\.custom-dropdown-rolagem\s*\{([^}]*)\}/) || [,''])[1];
  // O que tem que ser igual entre as plataformas é a altura do ITEM, não a da
  // caixa. A caixa abraça o conteúdo e para de crescer no teto; quem garante o
  // item é o flex-shrink: 0, sem o qual 9 formatos eram COMPRIMIDOS para caber
  // numa caixa de 180px em vez de rolar.
  check('a caixa tem teto, não altura fixa', /max-height:\s*var\(--alt-lista\)/.test(caixa), true);
  check('e é ela que rola', /overflow-y:\s*auto/.test(rola), true);
  const item = (css.match(/\.custom-dropdown-item\s*\{([^}]*)\}/) || [,''])[1];
  check('o item não encolhe', /flex-shrink:\s*0/.test(item), true);
  // e o item ativo não pode ficar mais alto: borda transparente na base
  check('o item já reserva a borda do ativo',
        /border:\s*calc\(var\(--borda\) \* 1px\) solid transparent/.test(item), true);
  // PÍLULA POR CONSTRUÇÃO: o raio sai da altura do próprio item, e não de um
  // token. Enquanto foi token, cada mexida no recuo ou na fonte deixava o raio
  // passar de metade da altura e o item ovalizava no UXP.
  check('o raio do item é derivado da altura',
        /border-radius:\s*calc\(\(var\(--esp-item-y\) \* 2/.test(item), true);
  check('e a entrelinha é explícita, para a altura ser calculável',
        /line-height:\s*1\.28/.test(item), true);
  check('não há mais token de raio de item', /--raio-item/.test(css), false);
  // a barra sai por recorte, não por CSS de barra
  check('a caixa recorta', /overflow:\s*hidden/.test(caixa), true);
  // a lista passa da borda exatamente a largura MEDIDA da barra, não um palpite:
  // o 20px fixo que havia antes deixava um vão à direita de todo item
  check('a lista passa da borda pela barra medida',
        /margin-right:\s*calc\(var\(--barra-rolagem[^)]*\) \* -1\)/.test(rola), true);
  check('e não devolve padding, que reabriria o vão', /padding-right/.test(rola), false);
}

const f = failCount();
console.log(`\n=== ${f === 0 ? 'TODOS OS TESTES PASSARAM' : f + ' FALHA(S)'} ===`);
process.exit(f === 0 ? 0 : 1);
