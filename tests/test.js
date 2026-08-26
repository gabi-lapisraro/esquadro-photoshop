const path = require('path');
const { boot, check, failCount, ROOT } = require(path.join(__dirname, 'harness.js'));
const { masterPlatforms } = require(path.join(ROOT, 'js/data_photoshop.js'));
const PS = require(path.join(ROOT, 'js/photoshop.js'));

// ---------- A. dataset com dados reais ----------
console.log('\n=== A. UI com o dataset real ===');
const calls = [];
let a = boot(masterPlatforms, {
  onCreateArtboards: (fmt, n) => { calls.push(['create', fmt && fmt.id, n]); return { ok: true, message: 'ok' }; },
  onApplyGuides: (fmt) => { calls.push(['guides', fmt && fmt.id]); return { ok: true, message: 'ok' }; }
});

console.log('\n-- A1. estado inicial --');
check('nome do formato preenchido', a.$('dropdownCurrentLabel').textContent.length > 2, true);
check('dimensao à direita, separada', /^\d+×\d+$/.test(a.$('dropdownCurrentDim').textContent), true);
check('acoes habilitadas', a.$('btnCreate').classList.contains('is-disabled'), false);

console.log('\n-- A1b. Instagram abre no Retrato 4:5 --');
check('primeiro item da lista', a.items()[0].getAttribute('data-id'), 'instagram-retrato-4-5');
check('e é o selecionado', a.$('dropdownCurrentDim').textContent, '1080×1350');

console.log('\n-- A2. crop escalado (instagram quadrado) --');
a.click(a.items().find(i => i.getAttribute('data-id') === 'instagram-quadrado-1-1'));
// a dimensão vive só no seletor agora; embaixo do preview não existe mais
check('dimensao no seletor', a.$('dropdownCurrentDim').textContent, '1080×1080');
check('crop visivel', a.$('cropOverlay').style.display, 'block');
// MAIÚSCULA na origem: o UXP ignora text-transform, então quem sobe a caixa é
// o JS, não o CSS. Se este teste voltar a passar com caixa mista, é sinal de que
// alguém devolveu a responsabilidade para o CSS — e no painel sairia minúsculo.
check('legenda', a.$('legendCropItem').querySelector('span').textContent, 'CORTE FEED');
// 1080px -> 84px de preview; lateral 135 -> 135*(84/1080) = 10.5px
// O 84 é a REDE do updatePreview: no jsdom não há layout, o palco mede 0 e o
// código cai no tamanho de segurança. No painel o canvas mede o palco. O que
// este teste guarda é a REGRA DE ESCALA, que é a mesma nos dois casos.
check('crop left escalado', a.$('cropOverlay').style.left, '10.5px');
check('crop right escalado', a.$('cropOverlay').style.right, '10.5px');
check('crop top zerado', a.$('cropOverlay').style.top, '0px');

console.log('\n-- A3. OOH existe no painel, mas sem dados: estado vazio --');
check('icone ooh presente', !!document.querySelector('.platform-icon[data-platform="ooh"]'), true);
check('ooh ausente do dataset', 'ooh' in masterPlatforms, false);
check('12 plataformas no painel', document.querySelectorAll('.platform-icon:not(.btn-toggle-strip)').length, 12);
a.pick('ooh');
check('label avisa vazio', a.$('dropdownCurrentLabel').textContent, 'Sem formatos disponíveis');
check('dimensao limpa no vazio', a.$('dropdownCurrentDim').textContent, '');
check('preview marcado vazio', a.$('canvasPreview').classList.contains('is-empty'), true);
check('criar travado', a.$('btnCreate').classList.contains('is-disabled'), true);
check('guias travado', a.$('btnGuidesOnly').classList.contains('is-disabled'), true);
const antesOoh = calls.length;
a.click(a.$('btnCreate'));
check('nao chama o Photoshop', calls.length, antesOoh);
a.pick('instagram');
check('recupera ao sair do ooh', a.$('canvasPreview').classList.contains('is-empty'), false);

console.log('\n-- A3b. as 3 pecas novas estao no dataset --');
const psIds = new Set(Object.values(masterPlatforms).flatMap(p => p.formats.map(f => f.id)));
check('reels presente', psIds.has('instagram-videos-e-reels-9-16'), true);
check('tiktok for you presente', psIds.has('tiktok-for-you-post-9-16'), true);
check('stickers presente', psIds.has('whatsapp-stickers-1-1'), true);
check('69 formatos no total', psIds.size, 69);

console.log('\n-- A4. acao real dispara callback e reporta sucesso --');
a.pick('instagram');
const n0 = calls.length;
a.click(a.$('btnCreate'));
check('callback chamado', calls.length > n0, true);

console.log('\n-- A5. contraste do tema, agora via variavel CSS --');
// O JS nao escreve mais cor inline: define --vermelho-raro e --sobre-acento na
// raiz, e o CSS resolve. O teste passa a ler a variavel.
const acento = () => document.documentElement.style.getPropertyValue('--vermelho-raro').trim();
const sobreAcento = () => document.documentElement.style.getPropertyValue('--sobre-acento').trim();
a.click(document.querySelector('.color-dot[data-color="#fea8fe"]'));
check('rosa -> texto escuro', sobreAcento(), '#222222');
check('rosa -> acento na raiz', acento(), '#fea8fe');
a.click(document.querySelector('.color-dot[data-color="#a2d2eb"]'));
check('azul -> texto escuro', sobreAcento(), '#222222');
a.click(document.querySelector('.color-dot[data-color="#e5e3d9"]'));
check('nude -> texto escuro', sobreAcento(), '#222222');
a.click(document.querySelector('.color-dot[data-color="#E61C00"]'));
check('vermelho -> texto branco', sobreAcento(), '#ffffff');

// ---------- B. estado vazio + dados degenerados ----------
console.log('\n-- A6. combinações: cada cor traz sua companheira --');
const companheira = () => document.documentElement.style.getPropertyValue('--companheira').trim();
check('4 bolinhas (Vinho fora do desenho)', document.querySelectorAll('.color-dot').length, 4);
const corte = () => document.documentElement.style.getPropertyValue('--guide-crop').trim();
const comb = c => { a.click(document.querySelector(`.color-dot[data-color="${c}"]`)); return [acento(), companheira()]; };
check('Vermelho + Nude',  comb('#E61C00').join('|'), '#E61C00|#e5e3d9');
check('Azul + Vermelho',  comb('#a2d2eb').join('|'), '#a2d2eb|#E61C00');
check('Rosa + Azul',      comb('#fea8fe').join('|'), '#fea8fe|#a2d2eb');
check('Nude + Rosa',      comb('#e5e3d9').join('|'), '#e5e3d9|#fea8fe');
// as duas guias são a companheira, em TODOS os temas. Houve uma exceção para o
// Vermelho, lida do 1.svg, que ela desfez: é Nude como o resto.
check('guia de corte segue a companheira', corte(), '#fea8fe');
comb('#E61C00');
check('no Vermelho também', corte(), '#e5e3d9');
a.click(document.querySelector('.color-dot[data-color="#E61C00"]'));

console.log('\n=== B. estado vazio e dados invalidos ===');
const stub = {
  instagram: { name: 'Instagram', formats: [
    { id: 'ok-1', name: 'Bom', width: 1000, height: 500, safe: { top: 50, bottom: 50, left: 50, right: 50 } }
  ]},
  linkedin: { name: 'Vazio', formats: [] }   // simula plataforma sem dados
};
const stubCalls = [];
let b = boot(stub, {
  onCreateArtboards: (f, n) => { stubCalls.push(['create', f]); return { ok: true }; },
  onApplyGuides: (f) => { stubCalls.push(['guides', f]); return { ok: true }; }
});

b.pick('linkedin');
check('label avisa vazio', b.$('dropdownCurrentLabel').textContent, 'Sem formatos disponíveis');
check('dimensao limpa no vazio', b.$('dropdownCurrentDim').textContent, '');
check('preview marcado vazio', b.$('canvasPreview').classList.contains('is-empty'), true);
check('safe oculto', b.$('safeOverlay').style.display, 'none');
check('crop oculto', b.$('cropOverlay').style.display, 'none');
check('btnCreate travado', b.$('btnCreate').classList.contains('is-disabled'), true);
check('btnGuides travado', b.$('btnGuidesOnly').classList.contains('is-disabled'), true);
const s0 = stubCalls.length;
b.click(b.$('btnCreate'));
b.click(b.$('btnGuidesOnly'));
check('nenhuma chamada ao PS', stubCalls.length, s0);
check('toast nao verde', b.$('toast').style.display !== 'block' || b.$('toast').classList.contains('is-error'), true);
b.pick('instagram');
check('recupera ao voltar', b.$('canvasPreview').classList.contains('is-empty'), false);
check('acoes reabilitadas', b.$('btnCreate').classList.contains('is-disabled'), false);

// ---------- C. checkCapacity (limite de 30.000px) ----------
console.log('\n=== C. checkCapacity ===');
const grande = { name: 'Outdoor Grande (sintetico)', width: 14173, height: 7087 };
const quad = masterPlatforms.instagram.formats.find(f => f.id === 'instagram-quadrado-1-1');

check('Outdoor Grande x1 cabe', PS.checkCapacity(grande, 1).ok, true);
check('Outdoor Grande x2 cabe', PS.checkCapacity(grande, 2).ok, true);
check('Outdoor Grande x2 = 28546px', PS.checkCapacity(grande, 2).totalWidth, 14173 * 2 + 200);
check('Outdoor Grande x3 NAO cabe', PS.checkCapacity(grande, 3).ok, false);
check('maxCount Outdoor Grande', PS.checkCapacity(grande, 3).maxCount, 2);
check('mensagem cita o maximo', /Máximo para este formato: 2/.test(PS.checkCapacity(grande, 3).message), true);
check('1080px x20 cabe', PS.checkCapacity(quad, 20).ok, true);
check('formato sem dimensao', PS.checkCapacity({ name: 'X', width: null, height: null }, 1).ok, false);
check('altura absurda', PS.checkCapacity({ width: 100, height: 40000 }, 1).ok, false);

console.log('\n-- B4b. corte só na PRIMEIRA prancheta --');
// Nível de FONTE, e não de comportamento: createArtboards precisa do
// executeAsModal do UXP, que não existe aqui. O que este teste guarda é a
// decisão — a área segura vai em todas as pranchetas, a linha de corte só na
// primeira, e o "Aplicar Guias" fica livre. Se alguém tirar o `i === 0`, cai.
{
  const fonte = require('fs').readFileSync(path.join(ROOT, 'js/photoshop.js'), 'utf8');
  const naCriacao = /_drawVerticalGuides\(doc, fmt, left, ([^)]+)\)/.exec(fonte);
  check('a criação passa o corte condicionado', naCriacao && naCriacao[1].trim(), 'i === 0');
  check('as funções aceitam o parâmetro',
        /_drawVerticalGuides\(doc, fmt, offsetX, comCorte = true\)/.test(fonte), true);
  check('e só desenham o corte quando pedido',
        /if \(comCorte && fmt\.crop && fmt\.crop\.lateral\)/.test(fonte), true);
  // aplicar guias continua livre: chama sem condição
  check('aplicar guias fica livre',
        /_drawVerticalGuides\(doc, fmt, board \? board\.x : 0\);/.test(fonte), true);
}

// ---------- D. nomenclatura do arquivo ----------
console.log('\n=== D. nome do arquivo ===');
const nomeCalls = [];
let d = boot(masterPlatforms, {
  onCreateArtboards: (fmt, n, nome) => { nomeCalls.push([nome, n]); return { ok: true }; },
  onApplyGuides: () => ({ ok: true })
});
const dd = String(new Date().getDate()).padStart(2,'0');
const mm = String(new Date().getMonth()+1).padStart(2,'0');
const HOJE = dd + mm;

console.log('-- D1. campo de tarefa nao existe mais --');
check('sem input de tarefa', d.$('taskInput'), 'null');
check('sem previa de tarefa', d.$('taskPreview'), 'null');

console.log('\n-- D2. nome inclui plataforma E formato --');
// escolhe um formato pelo id e devolve o nome que iria para o Photoshop
const nomeDe = (plat, fmtId) => {
  d.pick(plat);
  if (fmtId) {
    const item = d.items().find(x => x.getAttribute('data-id') === fmtId);
    if (!item) throw new Error('formato nao encontrado no dropdown: ' + fmtId);
    d.click(item);
  }
  d.click(d.$('btnCreate'));
  return nomeCalls[nomeCalls.length-1][0];
};

check('ig story',   nomeDe('instagram', 'instagram-story-9-16'),        `#TA\u042FEFA_IG_STORY_${HOJE}`);
check('ig feed quadrado',nomeDe('instagram', 'instagram-quadrado-1-1'),      `#TA\u042FEFA_IG_FEED_${HOJE}`);
check('ig reels',   nomeDe('instagram', 'instagram-videos-e-reels-9-16'),`#TA\u042FEFA_IG_REELS_${HOJE}`);
check('ig perfil',  nomeDe('instagram', 'instagram-avatar-destaques-1-1'),`#TA\u042FEFA_IG_PERFIL_${HOJE}`);
check('wpp sticker',nomeDe('whatsapp',  'whatsapp-stickers-1-1'),       `#TA\u042FEFA_WPP_STICKER_${HOJE}`);
check('lkd capa',   nomeDe('linkedin',  'linkedin-capa-4-1'),     `#TA\u042FEFA_LKD_CAPA_${HOJE}`);

console.log('\n-- D3. peças de feed compartilham o nome, sem dimensao --');
check('retrato 4:5 vira FEED', nomeDe('instagram','instagram-retrato-4-5'), `#TA\u042FEFA_IG_FEED_${HOJE}`);
check('retrato 3:4 vira FEED', nomeDe('instagram','instagram-retrato-3-4'), `#TA\u042FEFA_IG_FEED_${HOJE}`);
check('paisagem 16:9 vira FEED', nomeDe('instagram','instagram-paisagem-16-9'), `#TA\u042FEFA_IG_FEED_${HOJE}`);
check('feed sem dimensao', nomeDe('instagram','instagram-quadrado-1-1'), `#TA\u042FEFA_IG_FEED_${HOJE}`);

console.log('\n-- D3b. FEED so nas redes sociais --');
const idGads = masterPlatforms.google_ads.formats.find(f => f.name === 'Quadrado').id;
d.pick('google_ads');
const itG = d.items().find(x => x.getAttribute('data-id') === idGads);
d.click(itG); d.click(d.$('btnCreate'));
check('google ads mantem QUADRADO', nomeCalls[nomeCalls.length-1][0], `#TA\u042FEFA_GADS_QUADRADO_${HOJE}`);
d.pick('instagram'); d.click(d.$('modeAds'));
const idM = masterPlatforms.meta_ads.formats.find(f => f.name === 'Quadrado').id;
const itM = d.items().find(x => x.getAttribute('data-id') === idM);
d.click(itM); d.click(d.$('btnCreate'));
check('meta ads usa FEED', nomeCalls[nomeCalls.length-1][0], `#TA\u042FEFA_MADS_FEED_${HOJE}`);
d.click(d.$('modeOrganic'));

console.log('\n-- D3c. X separado em orgânico e pago --');
d.pick('twitter');
check('X organico tem 4 formatos', d.items().length, 4);
d.click(d.$('btnCreate'));
check('nome organico', /^#TA\u042FEFA_X_/.test(nomeCalls[nomeCalls.length-1][0]), true);
check('modeAds liberado no X', d.$('modeAds').classList.contains('is-disabled'), false);
d.click(d.$('modeAds'));
check('X ads tem 4 formatos', d.items().length, 4);
d.click(d.$('btnCreate'));
check('nome pago vira XADS', /^#TA\u042FEFA_XADS_/.test(nomeCalls[nomeCalls.length-1][0]), true);
d.click(d.$('modeOrganic'));

console.log('\n-- D3d. sem seção paga no guia: modo travado --');
for (const plat of ['linkedin', 'tiktok', 'whatsapp']) {
  d.pick(plat);
  check(plat + ' travado em Orgânico', d.$('modeAds').classList.contains('is-disabled'), true);
  const antes = d.items().length;
  d.click(d.$('modeAds'));
  check(plat + ' lista nao muda', d.items().length, antes);
  check(plat + ' segue Orgânico', d.$('modeOrganic').classList.contains('active'), true);
}

console.log('\n-- D4. nenhum nome sai malformado --');
let ruins = 0;
for (const [pk, pv] of Object.entries(masterPlatforms)) {
  const base = pk === 'facebook_ads' ? 'facebook' : pk === 'youtube_ads' ? 'youtube'
              : pk === 'meta_ads' ? 'instagram' : pk === 'twitter_ads' ? 'twitter' : pk;
  for (const fm of pv.formats) {
    d.pick(base);
    if (pk.endsWith('_ads') && pk !== 'google_ads') d.click(d.$('modeAds'));
    else d.click(d.$('modeOrganic'));
    const it = d.items().find(x => x.getAttribute('data-id') === fm.id);
    if (!it) continue;
    d.click(it); d.click(d.$('btnCreate'));
    const nm = nomeCalls[nomeCalls.length-1][0];
    // #TA\u042FEFA_PLAT_FORMATO_DDMM, tudo em maiuscula, sem acento e sem vazio
    if (!/^#TA\u042FEFA_[A-Z0-9]+_[A-Z0-9]+_\d{4}$/.test(nm)) { ruins++; console.log('   MALFORMADO: ' + nm + '  <- ' + fm.name); }
  }
}
check('todos os nomes bem formados', ruins, 0);

console.log('\n-- D5. modo Anuncio troca a abreviacao --');
d.pick('instagram'); d.click(d.$('modeAds'));
d.click(d.$('btnCreate'));
check('vira MADS', /^#TA\u042FEFA_MADS_/.test(nomeCalls[nomeCalls.length-1][0]), true);

const f = failCount();
console.log(`\n=== ${f === 0 ? 'TODOS OS TESTES PASSARAM' : f + ' FALHA(S)'} ===`);
process.exit(f === 0 ? 0 : 1);
