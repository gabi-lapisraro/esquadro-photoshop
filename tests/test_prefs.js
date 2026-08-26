const path = require('path');
const { boot, check, failCount, ROOT, storage } = require(path.join(__dirname, 'harness.js'));
const { masterPlatforms } = require(path.join(ROOT, 'js/data_photoshop.js'));

console.log('=== Preferências: reabre na última escolha ===');
const cb = { onCreateArtboards: () => ({ ok: true }), onApplyGuides: () => ({ ok: true }) };

// 1ª sessão: escolhe LinkedIn, um formato específico e o tema rosa
let a = boot(masterPlatforms, cb);
a.pick('linkedin');
const idAlvo = masterPlatforms.linkedin.formats.find(f => f.name === 'Capa').id;
a.click(a.items().find(x => x.getAttribute('data-id') === idAlvo));
a.click(document.querySelector('.color-dot[data-color="#fea8fe"]'));
const salvo = JSON.parse(storage.getItem('esquadro.prefs.v1'));
check('gravou plataforma', salvo.plataforma, 'linkedin');
check('gravou formato', salvo.formato, idAlvo);
check('gravou cor', salvo.cor, '#fea8fe');
check('nao gravou quantidade', 'quantidade' in salvo, false);

// 2ª sessão: mesmo localStorage, painel remontado
let b = boot(masterPlatforms, cb);
check('reabre no LinkedIn', document.querySelector('.platform-icon.active').getAttribute('data-platform'), 'linkedin');
check('reabre no formato salvo', b.$('dropdownCurrentLabel').textContent.includes('Capa'), true);
check('reabre no tema rosa', document.documentElement.style.getPropertyValue('--vermelho-raro').trim(), '#fea8fe');
check('quantidade volta em 1', b.$('qtdInput').textContent, '1');

// 3ª sessão: preferência apontando para plataforma que nao existe mais
storage.setItem('esquadro.prefs.v1', JSON.stringify({ plataforma: 'orkut', formato: 'inexistente', cor: '#E61C00', modo: 'organic' }));
let c = boot(masterPlatforms, cb);
check('ignora plataforma invalida', document.querySelector('.platform-icon.active').getAttribute('data-platform'), 'instagram');
check('cai no primeiro formato', c.$('dropdownCurrentDim').textContent.length > 2, true);

// 4ª sessão: sem nada salvo
storage.clear();
let d = boot(masterPlatforms, cb);
check('sem prefs, abre no padrao', document.querySelector('.platform-icon.active').getAttribute('data-platform'), 'instagram');

const f = failCount();
console.log(`\n=== ${f === 0 ? 'TODOS OS TESTES PASSARAM' : f + ' FALHA(S)'} ===`);
process.exit(f === 0 ? 0 : 1);
