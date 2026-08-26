# ESQUADЯO — estado do projeto

Documento de passagem. Lido em 25/08/2026, fim do dia; retomado na noite de
25/08 e ao longo de 26/08, quando o redesenho dos SVGs foi implementado e
**testado no Photoshop de verdade**.
Projeto: `~/Downloads/esquadro-photoshop`, git com histórico completo.

---

## Por onde continuar — 26/08, fim do dia

Tudo o que está aqui embaixo é contexto. Isto é o estado.

**Fechado nesta sessão:** o redesenho inteiro da UI, testado no painel; o pacote
`dist/ESQUADRO-1.0.0.{zip,ccx}` (448 KB), validado; a apresentação em três
formatos (artifact publicado, PDF e PPTX); e o `INSTALAR.md` com o Windows passo
a passo.

**Esperando resposta do Photoshop — uma coisa só:**

- **A prancheta nasce transparente?** Último commit. O valor `3` de
  `artboardBackgroundType` foi deduzido, não confirmado. Se sair branca, o log
  diz com que valor ela ficou e é trocar `_FUNDO_TRANSPARENTE` em
  `js/photoshop.js`. Ver "Bugs que já foram corrigidos".

**Aberto, em ordem de valor:**

1. **Instalar numa segunda máquina.** É o que falta para distribuir. "Funciona
   aqui" não é "instala no computador do colega" — ver "Distribuição".
2. **O gerador `planilha → js/data_photoshop.js`.** Enquanto não existir, editar
   a planilha não muda o plugin. As regras já estão escritas e conferidas; falta
   o invólucro. Ver "Dados".
3. **Formatos diferentes no mesmo arquivo.** Em estudo; a pergunta que abre é de
   interface, não de código. Ver "Em estudo".

**Antes de mexer em qualquer coisa**, leia "As armadilhas do UXP". Elas explicam
metade dos commits, e o motor descarta em silêncio o que não entende.

---

## O que é

Plugin UXP para Photoshop que cria pranchetas e guias dos formatos de mídia
social, a partir do Guia de Formatos Digitais da LAPISRARO.

**Funciona e está instalado.** Todos os caminhos de código já rodaram no
Photoshop 27.9.1 pelo menos uma vez, verificados por log. O redesenho subiu no
painel em 26/08 e foi ajustado ali, olhando: é dessa rodada que saíram as duas
armadilhas novas do UXP (raio virando elipse, `opacity` ignorado) e o itálico
sem arquivo.

Estado do pacote em 26/08: `dist/ESQUADRO-1.0.0.{zip,ccx}`, 441 KB, validado, e
instalado em `~/Library/Application Support/Adobe/UXP/Plugins/External/`.
Aparece como **Plugins > Lápis Raro > ESQUADЯO** e abre em 264x476.

---

## Como rodar as coisas

```bash
cd ~/Downloads/esquadro-photoshop

./empacotar.sh              # gera dist/ESQUADRO-1.0.0.{zip,ccx}
./empacotar-teste.sh        # instala uma 2ª cópia, lado a lado, para testar UI
./empacotar-teste.sh --remover
python3 verificar-uxp.py    # checa CSS contra o que o UXP suporta
python3 validar-pacote.py   # extrai o zip num diretório limpo e confere tudo
python3 gerar-playground.py # gera playground.html a partir do index/styles reais
python3 gerar-molduras.py   # deriva as pontas das molduras do desenho
python3 gerar-molduras.py --verificar   # o código ainda bate com o desenho?
python3 gerar-pdf.py        # apresentação em PDF, com as fontes embarcadas
cd docs && node gerar-pptx.js   # apresentação em PPTX, 13 slides
```

Instalação manual: copiar a pasta para
`~/Library/Application Support/Adobe/UXP/Plugins/External/` e **reiniciar o
Photoshop** (ele só varre essa pasta ao iniciar). Ver `INSTALAR.md`.

Os testes estão em `tests/` e usam jsdom — carregam o `index.html` e o
`data_photoshop.js` reais e exercitam o `ui.js` sem precisar do Photoshop:

```bash
cd tests && npm install   # uma vez
node test.js && node test_prefs.js && node test_playground.js && node test_molduras.js
```

`tests/computados.js` fotografa os valores computados dos elementos-chave.
Serve para provar que uma limpeza de CSS não mudou nada visualmente: rode
antes, rode depois, e compare com `diff`.

---

## As armadilhas do UXP — leia antes de mexer

Estas explicam metade dos commits. O motor do UXP entende um **subconjunto** do
CSS e **descarta o resto em silêncio**: sem erro, sem log. E nada disso aparece
em navegador, Figma ou playground, porque lá o CSS funciona inteiro.

| Armadilha | Sintoma | Solução |
|---|---|---|
| `gap` em flexbox é ignorado | "ainda está tudo colado", 3 rodadas | espaçamento só por `margin` |
| `outline` não segue `border-radius` | anel quadrado em bolinha redonda | `box-shadow`, ou `border` com `border-box` |
| CSS remoto não carrega | fonte da marca sumia | `@font-face` local, `.ttf` embarcado |
| itálico não é sintetizado | `font-style: italic` saía reto | embarcar o `.ttf` itálico |
| raio maior que metade da menor dimensão vira ELIPSE | botão oval com texto vazando; tooltip ovalado | raio ≤ METADE DA MENOR DIMENSÃO |
| `opacity` é ignorado | os 6 ícones apagados saíram todos cheios | recuar na COR, com `rgba()` |
| `text-transform` é ignorado | "Orgânico" em caixa mista | texto já em MAIÚSCULA na origem |
| transição de cor não completa | o sinal `−` ficou cinza com 2 pranchetas | não animar o que carrega ESTADO |
| `overflow: hidden` não rola | a lista de formatos não descia | deslocar por `margin-top` |

As duas últimas apareceram em 26/08, no primeiro teste do redesenho no painel.
O `999px` é o truque padrão de pílula na web: o CSS de verdade encolhe os dois
raios **pelo mesmo fator** quando não cabem, e sai pílula. O UXP encolhe cada
eixo **por conta**, e sai `rx = largura/2` com `ry = altura/2` — uma elipse.

**E não é só o 999.** O tooltip das plataformas ovalou com `--raio-caixa`, que
é 14,5px, num elemento de uns 17px de altura: 14,5 passa de 8,5, e o mesmo corte
por eixo acontece. O `verificar-uxp.py` só pega o caso gritante do três dígitos;
o resto é olho no painel. A regra a carregar na cabeça é **raio ≤ metade da
menor dimensão**.

`opacity` sendo ignorado derruba mais coisa do que parece: onde o estado era
dito por opacidade, ele passou a ser dito por cor. O `.is-disabled` mantém o
`opacity` porque não custa, mas quem carrega o "bloqueado" agora é `rgba()`.

**Transição de cor não completa no painel.** O sinal `−` do stepper ficava preso
no cinza de travado mesmo com 2 pranchetas: a classe saía e a cor não
acompanhava. A regra que sai daí é maior que o caso: **não animar o que carrega
ESTADO.** Cor que diz "isto está travado" não pode depender de transição. O
stepper anima só `background-color`, que não carrega estado nenhum.

Junto saíram três `!important` do stepper. Eles existiam para vencer uma cor
inline que o JS escrevia, e ele não escreve mais desde a refatoração — e
`!important` a mais é como o cascade do UXP acaba surpreendendo. O hover ganhou
`:not(.is-disabled)`, porque vinha depois com a mesma especificidade e acendia
sinal travado.

`text-transform` é do mesmo tipo: some sem avisar, e a regra continua no CSS
porque não custa e mantém o playground igual ao painel. Quem garante a caixa
alta é o **texto na origem** — os rótulos do `index.html` e o que o `ui.js`
escreve (rótulo do botão, legenda do corte, tooltip) já sobem em maiúscula.
O `verificar-uxp.py` passou a listar cada `text-transform` como nota, para
lembrar de conferir se existe texto de origem correspondente.

**A ordem das bolinhas de cor é Vermelho, Rosa, Azul, Nude.** Ela é só visual:
`data-par` e `data-corte` moram em cada bolinha, então reordenar não mexe em
nenhuma combinação.

Também sem suporte: **`opacity`**, **CSS Grid**, `::before`/`::after`, `float`, `clip-path`,
`aspect-ratio`, `:has()`. Irregulares: `flex-wrap`, `position: fixed`.

`verificar-uxp.py` varre o CSS **e o HTML** procurando tudo isso e **trava o
empacotamento** se achar erro. Cada regra declara a confiança: CONFIRMADO (visto quebrando
aqui), DOCUMENTADO (limitação conhecida, não testada por nós) ou IRREGULAR.
Supressão por `/* uxp-ok: motivo */` na linha.

---

## Bugs que já foram corrigidos (não reintroduzir)

- **`host` como array no manifest.** O Photoshop 27.x exige objeto para plugin
  de terceiro e aborta o parse inteiro. Sintoma: o plugin não aparece na lista.
- **`layer.kind === "artboard"`** nunca é verdadeiro no UXP. Prancheta é group
  com a propriedade `artboard` no descritor; lê-se por `batchPlay`.
- **`artboardRect` solto** no `make artboardSection`. Precisa vir aninhado sob
  um objeto `artboard`, senão o Photoshop ignora o retângulo em silêncio.
- **Coordenada de guia é ABSOLUTA**, medida do canvas. Cheguei a concluir o
  contrário; estava errado. `_drawVerticalGuides` soma o `left` da prancheta.
- **Fundo da prancheta é PROPRIEDADE DELA**, não do documento. O documento nasce
  transparente pelo `DocumentFill.TRANSPARENT`, e a prancheta vinha branca de
  qualquer jeito — é o padrão do Photoshop quando ninguém diz nada. O campo é
  `artboardBackgroundType`, pedido na criação **e** no `editArtboardEvent` de
  reforço, porque o `make` pode ignorar. O valor `3` sai da ordem das opções nas
  Propriedades (Branco, Preto, Transparente, Outro) e **não foi confirmado no
  painel**: se sair errado, o log diz com que valor a prancheta ficou, e esse
  número é a resposta.
- **`artboardEnabled` nem sempre vem** no descritor. Exigir essa flag fazia a
  detecção de prancheta falhar e a guia cair sempre na primeira.

---

## Dados: a cadeia e onde ela quebra

```
Guia de Formatos Digitais - Consultivo 2026.xlsx   ← FONTE, aba "Formatos"
   ~/Downloads/esquadro/
        │  xlsx_para_json.py   (~/Downloads/Guia de Formatos - Plugin UXP/)
        ▼
formatos.json + formatos-photoshop.json
        │  ETAPA MANUAL — não existe gerador
        ▼
js/data_photoshop.js    ← o que o plugin carrega
```

**Estado:** 69 formatos, batendo com a planilha em dimensão e margem, zero
divergência (conferido em 25/08).

**Pendência principal:** escrever o gerador `formatos.json → js/data_*.js`.
Enquanto não existir, editar a planilha **não** atualiza o plugin.

Duas regras já validadas contra os dados, para esse gerador usar:

- **Só margem lateral = linha de corte; tem topo ou base = área segura.**
  Testado nas 23 peças com margem: zero divergência.
- **`reserva_*` → área central centralizada** (é o `noInfoBox`, hoje código
  morto). Só o `youtube-capa-do-canal-16-9` usa.

O que falta na planilha: o rótulo da guia (`cropName`: "Corte Feed" / "Visível
no Mobile") só existe no `data_photoshop.js`.

**Cuidado:** `app_photoshop` digitado à mão na planilha é descartado — o
`derivar()` recalcula a partir de `tipo_midia`. Para incluir peça no Photoshop,
muda-se o `tipo_midia`.

**OOH não vai para o Photoshop:** as 6 peças são `Impresso`, `app_photoshop:
NAO`, e pertencem ao Illustrator. O ícone está no painel a pedido, e cai no
estado vazio (tratado: botões travam, nada chega ao Photoshop).

---

## Regras de lista e de quantidade

**A lista ROLA em vez de comprimir, e o que é igual entre as plataformas é a
altura do ITEM.**

Eu li errado o pedido na primeira vez e travei a altura da CAIXA. O que estava
quebrado era outra coisa: o item é filho de um flex column, e `flex-shrink` vale
1 por padrão — com 9 formatos numa caixa de 180px eles eram **comprimidos** para
caber em vez de transbordar. Daí a mesma lista parecer compacta no Instagram
orgânico e folgada no Meta Ads. `flex-shrink: 0` no item resolve: o que não cabe
transborda, e transbordar é o que a rolagem precisa.

Com isso a caixa volta a ter altura MÁXIMA (`--alt-lista`): ela abraça o conteúdo
e para de crescer quando enche. Altura fixa abria um vazio nas listas curtas.

**E o token é só o teto de PREFERÊNCIA.** O teto físico é o espaço que existe
até os botões, e quem escreve é o `limitarLista` do `ui.js`, ao abrir. A lista é
`position: absolute`: abrir não empurra nada, ela passa por cima do que vem
depois. No painel do Photoshop, mais baixo que o simulado no playground, os
268px do token cobriam os botões e o rodapé — e o playground não mostrava,
porque lá cabia.

Vence o menor dos dois, com 4px de respiro e piso de 60px (num painel muito
baixo, lista curta que rola é melhor que uma fatia de dois pixels).

**A primeira versão não funcionou no painel, e a causa vale guardar: eu medi
elementos invisíveis.** A caixa da lista acabou de sair do `display: none`, e no
UXP a medida dela volta ZERO — o layout ainda não foi recalculado. Com o topo em
zero, o "espaço disponível" virava a distância do alto do painel até os botões,
grande demais, e a lista abria inteira por cima deles.

O mesmo erro cortava o texto à direita: `medirBarraDeRolagem` também media a
caixa recém-aberta, desistia no zero, e o CSS caía num valor de reserva de 15px
que deslocava a lista.

As duas correções são a mesma ideia:

- **Medir de quem está sempre visível.** O topo da lista sai do GATILHO
  (`gatilho.bottom + 4`), não da caixa.
- **Medir no passo seguinte**, quando é a própria caixa que precisa ser medida.
  `medirBarraDeRolagem` virou `setTimeout(…, 0)`.
- **Valor de reserva ZERO, não palpite.** Sem medição a barra volta a aparecer —
  feio, mas inteiro. Com palpite, o que sobra dele corta o texto: some
  informação em vez de aparecer enfeite.
- **Medida sem sentido não vira decisão.** `cabe <= 0` desiste e deixa o teto do
  CSS valer.

Medido de 400 a 700px de painel, com o token em 268 e em 120: a lista dá 150,
218, 247 (o conteúdo) e 120, e em nenhum caso invade os botões ou passa da borda.
Há `console.log` em ambas as funções — se voltar a passar, o log do UXP diz onde
o gatilho termina, onde os botões começam e quanto ela achou que cabia.

Sobrou uma diferença de 2px: o item ativo tem borda, e borda soma na caixa. O
item base ganhou uma borda **transparente** do mesmo tamanho, então marcar um
item muda a cor e nada mais — mesmo princípio das bolinhas de cor. Medido: uma
altura só, 30,5px, nas três listas (9, 5 e 3 formatos), e a caixa em 180, 161 e
100.

**A ordem de proporção pode ser por plataforma.** `ORDEM_PROPORCAO` é a geral, e
`ORDEM_PROPORCAO_POR_BASE` sobrepõe por chave de dataset. Hoje só o `meta_ads`
usa: lá o quadrado vem antes do retrato, ao contrário do Instagram orgânico, que
abre no Retrato 4:5. São ordens diferentes de propósito — é a ordem em que a peça
é pedida em cada lugar.

**Alguns formatos são peça única.** `MAX_PRANCHETAS` guarda o teto por id de
formato; hoje só o `meta-ads-retrato-4-5`, com 1. É regra de VEICULAÇÃO, e não de
canvas — o limite por largura de canvas é outro e mora no `checkCapacity`.

Duas coisas que esse teto precisa fazer, e faz: travar o `+`, e **baixar a
quantidade ao trocar de formato**. Sem a segunda, quem estivesse com 3 na tela e
mudasse para o Retrato criaria três de qualquer jeito — o botão lê o número, não
o teto. Por isso o `selectFormat` chama `updateQtdLabel`, que ajusta e só então
redesenha o preview.

## Nomenclatura dos arquivos

```
#TAЯEFA_IG_FEED_2508   documento
1  2  3                pranchetas, uma por cópia pedida
```

**A LINHA DE CORTE sai só na PRIMEIRA prancheta.** A área segura vai em todas.
O corte serve para conferir o enquadramento uma vez; nas cópias ele só polui.
Quem quiser em outra prancheta usa o **Aplicar Guias**, que é livre e continua
desenhando tudo onde estiver.

Isso vale só no `createArtboards`: `_drawVerticalGuides` e
`_drawHorizontalGuides` ganharam um `comCorte` (padrão `true`), e o laço passa
`i === 0`. A horizontal não tem como ser por prancheta — guia horizontal
atravessa o canvas inteiro —, e não precisa: nenhum dos 7 formatos com corte usa
corte horizontal, são todos laterais.

**A nomenclatura vale só para o DOCUMENTO.** É o nome do arquivo que circula;
repetido em cada prancheta ele só enchia a paleta de camadas de linha longa e
igual. Quem procura uma prancheta procura pela ordem dela. Vale também quando
há uma só: ela se chama `1`.

`Я` é o cirílico U+042F, referência à marca. Data é DDMM **do dia da criação**.
`PLATFORM_ABBR` e `FORMAT_ABBR` em `js/ui.js` controlam as abreviações.
Quadrado, Retrato e Paisagem viram `FEED` nas redes sociais, mas não no Google
Ads, onde descrevem display ad.

---

## UI: onde parou

O CSS é dirigido por **59 tokens** com comentário `/* Grupo | Rótulo */`, que o
`gerar-playground.py` lê para montar os controles. O `playground.html` roda o
painel **de verdade** (JS real, embrulhado num `require` de mentira) e só mexe
em propriedades que o UXP suporta.

**Nenhum texto do painel é branco puro.** A escala de texto toda sai do **Nude
Raro** (229,227,217), que é a cor mais clara da paleta; os degraus
(`--text-muted`, `--text-dim`) são o mesmo nude com menos opacidade, para não
inventar cinza que não existe na marca. Conferido: zero elementos com
`rgb(255,255,255)` em `color`.

Isso inclui o texto **sobre** o acento: o `contrastOn` do `ui.js` devolve nude em
vez de branco. Sobre o Vermelho isso dá **3,6:1**, abaixo do AA para texto
pequeno (branco dava 4,6). Foi decisão de marca, e é o que o desenho pede — no
`1.svg` o rótulo do CRIAR PRANCHETA é nude sobre o vermelho. Sobre o painel
escuro o texto segue folgado, em 12,4:1.

As bordas e os fundos translúcidos continuam em `rgba(255,255,255,…)`: são
traço, não fonte. Se a marca também quiser o nude ali, é troca de número.

O tema define **duas variáveis na raiz** e o CSS resolve o resto. Zero escrita
de cor inline no JS — isso foi refatorado de propósito: estilo inline vence
qualquer regra de CSS e desfazia todo ajuste no `styles.css`.

**Combinações de cor** (lidas dos 4 SVGs em `UI Illustrator/`):

| Principal | Companheira (= as duas guias) |
|---|---|
| Vermelho | Nude |
| Azul | Vermelho |
| Rosa | Azul |
| Nude | Rosa |

A principal preenche o botão de criar e os sinais do stepper. A companheira
marca o modo ativo, o ícone da plataforma ativa, o wordmark **e as duas guias**.

Houve uma exceção que **foi desfeita**: o `1.svg` desenha a guia de corte do
tema Vermelho em Azul, e por um tempo o código tinha um `data-corte` por bolinha
para isso. Ela decidiu que não — no Vermelho a guia é Nude como o resto. O
atributo saiu; se a exceção voltar, é por ali.

**E não existe mais variável de guia.** Tirar o `data-corte` não bastou: havia
uma `--guide-crop` à parte, com valor padrão PRÓPRIO no `:root`, e esse padrão
era azul. Bastava o `ui.js` não reescrever ela — ao abrir o painel, por exemplo —
para o azul voltar sozinho no tema Vermelho. Foi exatamente o que ela viu.

As guias agora leem `--companheira` **direto** no CSS, e o `ui.js` não escreve
nada para elas. Duas variáveis para uma cor só é uma divergência esperando
acontecer, e o padrão de uma delas sempre vai estar errado para três dos quatro
temas.

**As duas guias — área segura e linha de corte — saem na mesma cor: a
secundária do tema.** Elas nunca aparecem juntas (só margem lateral = linha de
corte; tem topo ou base = área segura), então não precisam se distinguir por
cor. Antes a área segura ia na principal e a linha de corte num azul CRAVADO,
que não acompanhava o tema — era um bug, não uma decisão. O `--guide-safe` era
variável morta: ninguém lia.

**Opacidade, e não cor, é o que separa selecionado de não selecionado** na
fileira de plataformas: o ícone é sempre o mesmo desenho: quem não está
escolhido recua para **20%**, quem está fica cheio e ganha a companheira. O
hover só sobe para 55%, sem caixa e sem cor nova, para não competir com o
"está selecionado".

Duas exceções, ambas pedidas por ela e confirmadas pelo desenho:

- **O "…" fica sempre cheio.** Não é plataforma: é o que avisa que há mais. A
  20% ele sumia justo onde precisa ser notado.
- **As quatro bolinhas de cor ficam iguais e cheias**, sem recuo de opacidade e
  sem traço na ativa. Elas são a paleta da marca, não um controle de rádio —
  quem diz qual tema está no ar é o painel inteiro, que muda de cor junto. A
  classe `.active` continua sendo posta pelo JS (é dela que saem `data-par` e
  `data-corte`), mas não pinta mais nada. O token `--traco-selecao` ficou sem
  dono e foi removido.

### O redesenho dos SVGs, implementado em 25/08 à noite

Os 4 arquivos em `UI Illustrator/` mostram o desenho alvo. **Revisados em
25/08 22:15**, depois de ela alterá-los: o cabeçalho deixou de ser um balão
PREENCHIDO com "ESQUADЯO" em Noir, e virou um **cartão contornado** (traço
Nude, fundo do painel) com "ESQUADЯO" **na cor do tema**.

Os quatro pontos foram feitos:

1. **Duas molduras com recorte em Я** — uma no topo com ESQUADЯO, outra na base
   com LAPISRAЯO + BRAND INTELLIGENCE + as bolinhas. O cabeçalho único deixou
   de existir; a assinatura virou rodapé de verdade, colada na base do painel.
2. **Controles em pílula.** Orgânico e Anúncio chegaram a virar duas pílulas
   soltas, lidas do desenho, mas voltaram para um TRILHO só: é um controle de
   duas posições, não dois botões independentes. O contorno é do trilho, e a
   pílula preenchida por dentro é a posição atual — desliza de uma para a
   outra. O recuo de 2px separa a pílula do contorno e entra duas vezes na
   conta do raio interno.
3. **Seletor de formato** com o nome sublinhado e sem seta.
4. **"…"** no lugar do "+".

#### Como a moldura com recorte foi resolvida

O bloqueio era real: nem `clip-path` nem `::before`/`::after` existem no UXP, e
`border` não segue caminho arbitrário. A saída foi **fatiar a moldura em três**:

```
[ ponta esquerda ]===== miolo que estica =====[ ponta direita ]
```

As **pontas** são SVG inline de largura fixa: carregam o recorte e desenham o
traço com `stroke`. O **miolo** é uma div com `border-top` e `border-bottom`, e
é ele que absorve a largura do painel — que muda, porque o usuário
redimensiona. Nada de `position: absolute`, nada de JS, nada de redesenhar em
evento de resize.

Três detalhes que custaram a acertar, e que vale não desfazer:

- **A ponta avança por cima do miolo.** O viewBox de cada ponta carrega meia
  espessura de folga para o traço não sair cortado, e o recorte da direita
  passa do ponto de encontro. Sem o `margin` negativo, sobra um furo na linha.
- **A moldura da base tem a linha de cima e a de baixo deslocadas** uma da
  outra. O miolo é só onde as DUAS existem; a sobra de cada reta volta para
  dentro da ponta, senão falta pedaço de traço.
- **A ponta segue `--linha`, não a altura da moldura.** `--linha` é a altura
  menos uma borda, que é a distância de eixo a eixo entre as duas linhas. Sem
  esse desconto o traço dá um degrau de meio pixel no encontro.

Conferido no navegador de 180px a 700px de largura: encaixe zero nos quatro
cantos, e as pontas não distorcem — o miolo absorve tudo.

**`gerar-molduras.py` deriva as pontas do desenho** (`UI Illustrator/1.svg`) e
escreve os valores que o CSS precisa. `--verificar` compara o código com o
desenho e sai com 1 se divergirem. Não trava o empacotamento de propósito:
reexportar o SVG é trabalho normal, não acidente. Se ela mexer nas molduras no
Illustrator, o caminho é rodar o gerador e colar o que ele der.

**O que ainda não foi visto no Photoshop.** Isto tudo foi verificado em
navegador, e navegador entende CSS que o UXP descarta. O que só o painel
responde:

- **SVG inline com `stroke` e `currentColor`.** Os ícones já usam `fill`
  com `currentColor` e funcionam; `stroke` é a aposta nova.
- **`calc` com parêntese aninhado** e **custom property declarada fora do
  `:root`** — `--linha` e `--meia-borda` moram no `.moldura-topo`/`.moldura-base`.
  Se qualquer um dos dois não pegar, a ponta perde largura e **some**, o que é
  uma falha barulhenta, não silenciosa. É de propósito.
- **Margem negativa em item de flex.**

Se a ponta sumir, o suspeito é o `calc` aninhado; a saída é escrever os valores
já resolvidos em px, aceitando que mexer na altura no playground pare de
funcionar sozinho.

### As duas divergências, decididas por ela em 25/08

1. **O tema Vermelho marca a escolha em Nude, e corta em Azul.** Era de
   propósito: o `1.svg` está certo. Companheira e guia de corte deixaram de ser
   a mesma variável — a bolinha declara um `data-corte` quando difere, e só o
   Vermelho usa. Nos outros três temas a guia continua sendo a companheira.

2. **Um botão é cheio, o outro é vazado.** CRIAR PRANCHETA preenchido com a
   principal, APLICAR GUIAS só contornado na mesma cor. Desfez o "contornados,
   com o acento só no hover".

   **No hover cada um responde do seu jeito, sem trocar de natureza.** O CHEIO
   se preenche com a companheira e a letra vai para `--sobre-companheira`, que o
   `ui.js` calcula por contraste. O VAZADO continua vazado: o que muda é o
   traço, que vai para a companheira, e a letra, que vai para a principal.

   | Tema | Cheio no hover | Vazado no hover |
   |---|---|---|
   | Vermelho | fundo Nude, letra `#222` | traço Nude, letra Vermelho |
   | Azul | fundo Vermelho, letra branca | traço Vermelho, letra Azul |
   | Rosa | fundo Azul, letra `#222` | traço Azul, letra Rosa |
   | Nude | fundo Rosa, letra `#222` | traço Rosa, letra Nude |

   Os fundos do cheio passam WCAG AA nos quatro (12,4:1 / 4,6:1 / 9,8:1 /
   9,3:1). A letra do vazado é a principal sobre o painel escuro, que é
   exatamente para o que `--acento-visivel` existe.

Sobra um lugar onde o desenho e o código ainda discordam, não decidido: a
**caixa do stepper**. Nos 4 desenhos ela é contornada na PRINCIPAL, como o
APLICAR GUIAS; no painel está no cinza neutro da borda. É um token de trocar.

### O playground AVISA de raio que ovaliza

A regra "raio ≤ metade da menor dimensão" não dá para conferir no CSS: depende da
altura renderizada. E não dá para ver no navegador, que encolhe os dois raios
pelo mesmo fator e mostra pílula onde o UXP mostra elipse.

Então o playground mede e avisa, numa tarja amarela embaixo dos controles. Três
detalhes que ele custou a acertar:

- **Ignora porcentagem.** `border-radius: 50%` é metade por definição e nunca
  ovaliza; as bolinhas de cor apareciam como falso positivo.
- **Agrupa por seletor.** Nove itens de lista com o mesmo defeito são um defeito,
  não nove.
- **Espera a transição.** Os controles animam o `border-radius`, e ler no mesmo
  passo — ou um quadro depois — devolvia valor intermediário: o aviso saía com
  número errado e um passo atrasado. São 250ms de debounce.

Foi ele que pegou os dois raios da rodada de 26/08: `--raio-item` em 16,5 num
item de 29,5, e o toast herdando `--raio-caixa` 18 numa altura de 28. O toast
ganhou raio próprio, como o tooltip.

**E o item da lista deixou de ter token de raio.** Ele avisou uma terceira vez —
ela baixou `--esp-item-y`, o item encolheu, e o 14,5 que cabia passou a não
caber. Um token que precisa ser reajustado a cada mexida em outro token é o
problema, não o valor. Agora o raio é **metade da altura do próprio item**,
calculada de `--esp-item-y`, `--borda` e `--fonte-item`.

Para a altura ser calculável, a entrelinha virou **explícita** (`1.28`, que é
exatamente o `normal` desta fonte, então nada mudou de aparência). Isso traz um
segundo ganho: `normal` é definido pelas métricas da fonte **como cada motor as
lê**, e navegador e UXP podem discordar. Fixando, o item tem a mesma altura nos
dois. Conferido com recuo de 2 a 20 e fonte de 9 a 16: o raio é sempre metade da
altura, e a tarja nunca acende.

### O playground LEMBRA o que ainda não virou código

O `playground.html` é gerado de novo a cada mexida no `styles.css` — e é justo
no meio do ajuste dela que eu regero. Recarregar a página jogava fora todo
slider que ainda não tinha me chegado. Aconteceu de verdade, e ela achou que eu
tinha desfeito as alturas dela.

Agora os controles ficam no `localStorage`. O que ele guarda são DOIS mapas: o
valor que ela escolheu e o valor que o ARQUIVO tinha na hora. Ao carregar, se o
arquivo mudou desde então, **o arquivo manda** — foi decisão nova, e sobrepor
com o valor velho faria parecer que a mudança não pegou. Um lembrete embaixo dos
botões diz quantos ajustes voltaram, e "Voltar ao atual" descarta tudo.

Está todo em `try/catch`: `localStorage` estoura em origem opaca — é o caso do
`jsdom` nos testes e do navegador embutido, que serve por `data:`. Sem guarda,
isso derrubaria o playground inteiro.

### O playground ganhou a ALTURA DO ENCAIXE

Era o único ajuste que faltava e não dava para fazer: a altura do painel estava
cravada em 520px no gerador. Agora é um controle, no grupo **Painel**, no topo
da coluna.

Não é token do `styles.css` — no Photoshop quem escolhe a altura é quem arrasta
o painel. O input carrega `data-fora="1"`, e por isso ele muda a tela mas **não
entra no CSS de saída**: o que ela copia continua sendo só os tokens de
verdade. Serve para ver como o rodapé se comporta num painel mais alto ou mais
baixo — o rodapé fica colado na base, e `--esp-abaixo-rodape` é o que o levanta.

### O painel tem ALTURA, não altura mínima

Subir o palco para 150px cortou o rodapé: o conteúdo passou da borda de baixo do
painel. A causa não era o palco — era o `.panel-container` ter só
`min-height: 100vh`. Com mínimo e sem teto ele **crescia junto com o conteúdo**,
nenhum filho flexível precisava ceder, e o que sobrava saía pela borda.

Agora a corrente é `html`/`body`/`.panel-container` todos em `height: 100%`, e o
container é exatamente a altura do painel. O `min-height: 100vh` fica como rede:
se a corrente não pegar no UXP, volta ao comportamento antigo.

Com o teto no lugar, **quem cede é o palco**: `flex: 1 1 var(--alt-stage)` com
`min-height: 0`. Ele pede `--alt-stage`, cresce até o teto do card num painel
alto, e comprime num painel baixo. Medido no playground, o rodapé cabe em todas:

| Painel | Palco |
|---|---|
| 400px | 86px |
| 440px | 126px |
| 478px | 161px |
| 520px e acima | 161px (teto do card) |

**O playground também mentia sobre isso.** O painel simulado usava `min-height`,
então crescia e escondia justo o defeito que interessa ver. Agora ele tem altura
fixa e `overflow: hidden`, como um painel encaixado de verdade.

### A lista de formatos ROLA SEM INDICADOR, e não é por preguiça

**Seis versões de barra, nenhuma boa.** Vale a lista inteira, para ninguém
recomeçar:

| Tentativa | Por que caiu |
|---|---|
| `scrollbar-width: none`, `::-webkit-scrollbar { width: 0 }` | o UXP ignora as duas |
| Recortar a barra para fora da caixa | no UXP ela é FLUTUANTE: `offsetWidth - clientWidth` dá zero, não ocupa layout, não há faixa a recortar |
| Estilizar fina e discreta | ignorado também |
| Véu opaco por cima | ela pinta acima de qualquer elemento posicionado |
| Setas nas pontas | funcionava, e era feia |
| Barra desenhada por nós, 3px | funcionava, e ela não quis barra nenhuma |

**E a armadilha maior:** `overflow: hidden` com `scrollTop` no JS — que era a
base das duas últimas — **não rola no painel**. O UXP trata `overflow: hidden`
como "não há área rolável", e `scrollTop` simplesmente não anda. No navegador
anda, então isso passa batido até alguém abrir o Photoshop.

Por isso a lista **não rola: ela se DESLOCA.** A camada de dentro cresce à altura
de todos os itens, e o `ui.js` a sobe com `margin-top` negativo; a de fora
recorta. Margem negativa e recorte são duas coisas que o painel já provou
entender — as pontas das molduras dependem da primeira.

Dois gestos movem, e a escolha não é redundância:

- **A roda**, que é o natural.
- **Arrastar a própria lista**, que é a garantia: a roda é a única parte disso
  que não se confirmou no UXP, e `mousedown` sim — o painel inteiro depende de
  clique. O arrasto só vale depois de 4px e, a partir daí, **cancela o clique**:
  arrastar não pode escolher um formato sem querer.

Medido num painel de 420px com 9 formatos: roda de 500px para baixo para em
-77px, que é o máximo, com o último item à vista; -500 volta a zero; arrastar 80px
faz o mesmo; e num painel de 700, onde tudo cabe, o deslocamento fica em zero.
Nenhuma barra em nenhum momento.

### O preview era "travado": o vazio estava DENTRO dele

Ela não conseguia mudar a distância do preview para o seletor, e nenhum
espaçamento mordia. O motivo: o palco **crescia até encher o card**, e o canvas
ficava centrado nesse vazio. O espaço que ela via não era entre dois blocos —
era dentro do preview, e por isso margem nenhuma o alcançava.

Duas mudanças resolvem:

- `.preview-card` passou a `justify-content: flex-start`. Com `center` o canvas
  boiava no meio; agora o topo é fixo e a folga cai depois do preview.
- `.preview-stage` ganhou `max-height: var(--alt-stage)`. Ele continua podendo
  ENCOLHER quando falta espaço — é o que impede o corte —, mas não pode mais
  INCHAR quando sobra. Era o inchaço que empurrava o canvas para longe.

Agora a distância do seletor ao canvas obedece a `--esp-controles` mais
`--esp-preview-topo`. Medido: com o topo em 0 dá 11px, em 10 dá 21, em 30,5 dá
34,8. Acima disso o card bate no `--alt-preview-max` e o ganho desacelera — o
teto está fazendo o trabalho dele.

#### Padding negativo: três estragos em cadeia

Ela chegou a `--esp-preview-base: -17px`, depois `-7px`, tentando puxar o
preview para cima. Padding negativo não existe em CSS — mas ele não foi só
ignorado. Fez três estragos, e é por isso que o preview continuou "travado"
mesmo depois de eu consertar o alinhamento:

1. **Derrubou o atalho inteiro.** A regra era
   `padding: var(--esp-preview-topo) 10px var(--esp-preview-base)`. Um único
   valor inválido invalida a **declaração toda** — o `padding-top` foi junto, e
   o "Preview | Topo" parou de fazer qualquer efeito. Agora os quatro lados são
   declarações separadas: um valor ruim derruba só o próprio lado.
2. **Sumiu o controle do playground.** O regex que lê os tokens do CSS era
   `(\d+(?:\.\d+)?)`, sem sinal. Com o valor negativo o token não casava e
   **desaparecia da coluna** — ela perdia o slider e não tinha como desfazer.
   O regex passou a aceitar `-?`.
3. **O campo numérico deixava digitar.** Agora tem piso em zero.

#### O topo e o preview dividem o mesmo espaço

Com o mecanismo consertado, os valores dela ficaram visíveis pelo que eram:
topo 95 + interno 29 + abaixo 73 deixavam o canvas em **20x25px**. Não é bug — é
que o card tem uma altura só, e cada pixel de recuo sai do palco.

Medido num painel de 478px:

| topo / interno / abaixo | canvas |
|---|---|
| 95 / 29 / 73 | 20 x 25 |
| 30 / 10 / 20 | 130 x 162 |
| 20 / 8 / 16 | 142 x 178 |
| **12 / 8 / 12** | **152 x 190** |

Ficou em 12 / 8 / 12.

#### O canvas ficava com o tamanho de antes

O canvas mede o palco, mas só quando `updatePreview` roda — e mexer num slider
não rodava. O canvas ficava do tamanho de antes, maior que o palco, e como o
palco centra, ele **transbordava para cima e para baixo**, cobrindo o "Corte
Feed". O `ui.js` passou a exportar `atualizarPreview`, o playground chama a cada
token mexido, e o painel escuta `resize` — em `try/catch`, porque não confirmei
esse evento no UXP.

Depois disso a distância anda 1:1 com o token: topo 0 dá 3,8px (que é o
`--esp-controles`), topo 20 dá 23,8, topo 50 dá 53,8, topo 95 dá 98,8.

### O canvas do preview mede o palco

`updatePreview` tinha **84x108 cravados**. O `--alt-stage` do playground só
mudava o vazio em volta do canvas: era um controle que não controlava nada, e a
única razão de o preview parecer pequeno no painel.

Agora o canvas lê `clientWidth`/`clientHeight` do `.preview-stage` e ocupa o
palco inteiro, respeitando a proporção do formato. Ele cresce junto com o
painel, que o usuário redimensiona, e o token voltou a valer.

O 84x108 ficou como **rede**: se o UXP devolver 0 — elemento ainda sem layout,
ou `clientWidth` sem suporte —, o preview cairia para tamanho zero e sumiria.
Melhor pequeno do que invisível. É essa rede que os testes exercitam: no jsdom
não há layout, o palco mede 0, e o que fica guardado é a REGRA DE ESCALA das
guias, que é a mesma nos dois caminhos.

### O preview tem teto de altura agora

`.preview-card` tem `flex: 1` de propósito: ele absorve a altura que sobra do
painel, para a folga virar respiro em volta do canvas em vez de virar vazio
entre os botões e o rodapé. O efeito colateral é que num painel alto o preview
engolia tudo, e **mexer em `--alt-stage` não encurtava o bloco**.

Agora existe `--alt-preview-max`. Passando do teto, a folga volta a cair entre
os botões e o rodapé — onde dá para ver e julgar. Com o teto em 128px e os
tokens de hoje, a altura natural do painel fica em torno de **463px**: mais alto
que isso, abre espaço acima do rodapé.

### A dimensão saiu de baixo do preview

Ela já aparece no seletor de formato, e repetida embaixo do preview não dizia
nada de novo. Saiu o `<span id="dimText">`, a regra `.dim-badge`, as duas
escritas no `ui.js` e os dois tokens que só ela usava (`--fonte-dim` e
`--peso-dim`) — 61 tokens viraram 59.

Os testes que afirmavam a dimensão passaram a afirmar no seletor, que é onde ela
mora agora. A leitura continua coberta: se o cálculo de dimensão quebrar, o
teste quebra.

### Espaçamento, altura e fonte: medidos no desenho

Não foram no olho. Todos os valores saíram de `UI Illustrator/1.svg`,
convertidos com **k = 1,0928** — a razão entre o painel simulado do playground
(264px de largura) e a largura do desenho (241,58 unidades). Se um dia o painel
de referência mudar de largura, é esse k que muda.

**Os valores da tabela abaixo são o ponto de partida, não o estado atual.** Ela
passou a régua no playground depois disso e reajustou quase tudo; o que vale é o
`:root` do `styles.css`. A tabela fica porque mostra DE ONDE cada número saiu.

| Token | Antes | Calibrado no desenho | No desenho |
|---|---|---|---|
| `--esp-corpo-x` | 14px | 18px | margem lateral 16,49 un |
| `--esp-cabecalho` | 25px | 23px | 21,51 un acima da moldura |
| `--esp-blocos` | 10px | 22px | ícones → controles |
| `--esp-controles` | 3px | 5,5px | controles → seletor, 5,00 un |
| `--esp-modo-stepper` | 4px | 4,5px | folga entre pílulas, 4,17 un |
| `--esp-dropdown-x` | 7,5px | 11px | recuo do texto no seletor |
| `--esp-assinatura` | 6,5px | 3,5px | entre as linhas do rodapé |
| `--esp-corpo-base` | 39px | 7px | botões → moldura da base |
| `--esp-abaixo-rodape` | — | 17px | 15,89 un até a base do painel |
| `--alt-controle` | 25px | 20px | 18,56 un |
| `--alt-seletor` | 28px cravado | 26px | 23,93 un — virou token |
| `--alt-botao` | 29px | 23,5px | 21,54 un |
| `--alt-moldura-topo` | — | 54px | 49,19 un, eixo a eixo |
| `--alt-moldura-base` | — | 36px | 33,33 un |
| `--alt-logo` | 12px | 21px | ESQUADЯO, 19,15 un |
| `--alt-wordmark` | 8px | 5,5px | LAPISRAЯO é bem pequeno no desenho |
| `--tam-color-dot` | 4,5px | 3,5px | elipse de rx 1,6 |
| `--fonte-modo` | 8,5px | 7,5px | 7,0 un |
| `--fonte-stepper` | 8,5px | 7,5px | 7,0 un |
| `--fonte-stepper-sinal` | 12px | 10px | o desenho usa Arial, com métrica outra |
| `--fonte-fmt-dim` | 11px | 7,5px | 6,77 un |
| `--fonte-botao` | 10px | 8,5px | 8,0 un |
| `--peso-dropdown` | 700 | 400 | o desenho usa Regular, não Bold |
| `--raio-controle` | 0 | 999px | pílula |
| `--raio-caixa` | 0 | 14px | caixa da lista, concêntrica com as pílulas |
| `--raio-item` | 0 | 999px | item da lista também é pílula |

Três decisões dentro disso:

- **`--fonte-stepper-sinal` é chute calibrado, não medida.** No desenho o − tem
  10 un e o + tem 7,18 un, porque são glifos de Arial com métrica diferente. No
  painel os dois saem em IBM Plex Mono e precisam do mesmo tamanho. 10px é o
  meio-termo; é o primeiro que vale mexer se destoar.
- **`--fonte-rodape` ficou em 5,5px**, embora o desenho peça 3,8. Era pedido
  aberto dela, e o desenho puxa para menor ainda, não para maior.
- **O `stroke-width` das pontas continua em 0,88** no index.html, calibrado
  para 1px nas alturas de 56/38. Com 54/36 o traço fica ~4% mais fino que a
  borda do miolo. Invisível num fio de 16% de opacidade; se aparecer, o valor
  é 49,19 ÷ altura do topo e 33,33 ÷ altura da base.

### Pedidos abertos do último ciclo

- Rodapé em fonte pequena (5,5px hoje); decisão dela se sobe.

Resolvidos em 25/08, no fim: o playground ganhou campo numérico sem teto ao
lado de cada slider (digitar acima do máximo ESTICA o slider), o token morto
`--peso-modo-ativo` ganhou dono, e a cascata do CSS foi consolidada.

---

## Apresentação em PPTX

```bash
cd docs && npm install pptxgenjs && node gerar-pptx.js
```

13 slides, mesma paleta e mesma tipografia do documento online. O `docs/gerar-pptx.js`
é a fonte: HTML não vira slide sozinho — o documento é uma coluna contínua, o slide
é uma página com margem —, então o script é a tradução, não uma conversão. Quando o
conteúdo do `apresentacao.html` mudar, o texto do script precisa acompanhar à mão.
São dois formatos com ritmos diferentes e não vale amarrar um no outro.

A imagem do painel é `docs/assets/painel.png`, capturada do `playground.html` a 3x
e recortada na coluna do painel.

**Não deu para conferir com o olho.** Esta máquina não tem PowerPoint, Keynote nem
LibreOffice, então não houve como renderizar os slides em imagem. O que foi
conferido: o `validate.py` do pacote passa, o texto está na ordem em todos os 13, e
uma auditoria de geometria lida do XML não achou caixa fora do slide nem margem
apertada. **O que falta é o olho dela** — se algum texto estourar a caixa, é aí.

## Apresentação em PDF

Para ela editar no Illustrator e remontar no Google Docs:

```bash
python3 gerar-pdf.py     # sai em docs/ESQUADRO-apresentacao.pdf
```

Sai em `docs/`, e **não em `dist/`**: o `empacotar.sh` faz `rm -rf dist` antes de
montar o pacote, então um PDF ali dura até o próximo empacotamento. Aconteceu.

Duas coisas quebram esse PDF, e as duas em silêncio:

- **As fontes.** O `apresentacao.html` busca o Plex do Google Fonts, que é o certo
  para a página publicada. Mas o Chrome headless sem rede não busca nada, e o PDF
  sai **todo em Menlo**. O script gera uma CÓPIA do HTML com as fontes em data
  URI, lidas de `~/Library/Fonts`, e deixa o arquivo original intocado. A dica
  `format('truetype')` é necessária — sem ela o Chrome recusa.
- **A cor de fundo.** O navegador a descarta ao imprimir. É o que o bloco
  `@media print` do `apresentacao.html` resolve: liga `print-color-adjust: exact`,
  força o tema claro (fundo escuro em papel gasta tinta e some no Illustrator) e
  impede seção cortada no meio da página, o que importa para quem vai remontar.

O script confere o resultado e **avisa se sobrou Menlo**, que é o sintoma de
fonte que não embarcou. Hoje sobra uma, e é conhecida: o `Milo`.

**O `Milo` nunca funcionou, nem na web.** O CSS pede a família `'Milo'`, e a
instalada chama **`Milo OT`** — nome diferente, então o corpo do texto sempre caiu
no Plex. Não foi corrigido a pedido dela ("não precisa de preciosismo com a
fonte"), e fica anotado porque é de uma linha: trocar o nome no `--sans`.

## Apresentação

Publicada e privada: <https://claude.ai/code/artifact/671e604f-cfb2-4a21-896a-f2e8473bb4c2>
Fonte versionada em `docs/apresentacao.html`.

Para atualizar, republicar **o mesmo caminho de arquivo** ou passar a URL —
senão vira um artifact novo. Está privada; compartilhar pelo menu da página.

Contraste corrigido para WCAG AA nos dois temas, verificado par por par.
`--accent` (texto) e `--accent-surface` (fundo) são separados de propósito: o
acento clareia no tema escuro para ser legível como texto, mas como superfície
clareado reprovava com texto branco.

---

## Como o plugin aparece no Photoshop

```
Plugins > ESQUADЯO > Lápis Яaro
```

O `name` do manifest é o que vira o item do menu; o `label` do entrypoint é o
painel dentro dele.

**Não existe como tirar o nível do meio.** O manifesto v5 não tem chave para
isso: o Photoshop monta `Plugins > nome do plugin > painel` por conta. Ela pediu
só `Plugins > Lápis Raro`, e o que dá é escolher qual palavra fica em cada
nível — a marca ficou no primeiro. **A confirmar no painel:** se o Photoshop
achatar plugin de um painel só, sai exatamente `Plugins > Lápis RAЯO`; se não,
sai com o ESQUADЯO dentro. De um jeito ou de outro, o primeiro nível é o que ela
pediu, e é por isso que a apresentação cita só ele.

O `Я` é o cirílico U+042F, como no nome dos arquivos, e aparece **nos dois**:
no ESQUADЯO e em "RaЯo".

**É o SEGUNDO R de Raro que vira, não o primeiro** — LAPISRAЯO. Estava errado em
dois lugares (no rótulo do painel e no rodapé de `docs/apresentacao.html`) até
ela corrigir em 26/08. O `aria-label` do wordmark em vetor diz só "LAPISRARO",
sem o cirílico, porque ali quem desenha a letra virada é o próprio vetor.

**Achado no caminho: `preferredDockSize` não existe.** A chave certa é
`preferredDockedSize`, com o "ed". A errada ficou no manifest sem fazer nada, e
o Photoshop **ignorou calada** — a mesma armadilha do CSS, agora no JSON. O
painel agora abre em 264×476, que é o tamanho em que a UI foi calibrada.

O `validar-pacote.py` passou a conferir as chaves do entrypoint contra a lista
do manifesto v5, e **trava o empacotamento** se achar uma que não existe. Testei
recolocando a chave errada: ele pega.

## Em estudo: formatos DIFERENTES no mesmo arquivo

Ideia dela, para o futuro: em vez de N cópias do mesmo formato, um documento com
pranchetas de formatos diferentes — o Feed, o Story e o Reels da mesma campanha
lado a lado.

O que já está pronto para isso: o `createArtboards` já posiciona prancheta por
prancheta, somando `left`, e já desenha guia por prancheta com o offset dela. A
mudança de assinatura é pequena — receber uma LISTA de formatos em vez de um
formato e uma contagem.

**A guia horizontal NÃO é o problema que eu supus.** Eu tinha escrito aqui que
ela atravessaria o canvas e cortaria as pranchetas vizinhas ao meio. Ela disse
que não é isso que acontece no Photoshop: **as guias das outras pranchetas ficam
ATRÁS da prancheta selecionada.** Quem trabalha numa prancheta vê as guias dela.

Isso muda o quadro por completo: o caminho direto — pranchetas lado a lado, cada
uma com o seu formato e as suas guias — parece viável, e não precisa de nenhuma
das saídas de emergência que eu havia listado (empilhar na vertical, um documento
por formato, trocar guia por camada). Elas saíram daqui.

Lição para mim, e é a segunda vez neste projeto: **não afirmar comportamento do
Photoshop sem ver.** A primeira foi concluir que a coordenada de guia era relativa
à prancheta quando é absoluta. Aqui eu inventei um bloqueio que não existe, e um
bloqueio inventado custa mais caro que um bug — ele muda o desenho da solução
antes de alguém checar.

O que falta confirmar, e agora é uma pergunta pequena: se a guia desenhada pelo
plugin (`doc.guides.add`, em coordenada absoluta) é adotada pela prancheta que
está debaixo dela — porque é isso que faz ela ficar "atrás" das outras. A
observação dela sugere que sim.

Além disso, três coisas mecânicas para resolver quando for a hora:

- **Altura do documento** passa a ser a do formato mais alto, não a de todos.
- **O nome do documento** precisa de um token para "misto": hoje ele leva a
  abreviação do formato único.
- **O limite de 30.000 px** vale para a soma das larguras, e o `checkCapacity`
  hoje calcula sobre um formato repetido.

## Distribuição, que é o próximo passo

O pacote está **validado**: `validar-pacote.py` extrai o zip num diretório
limpo e confere o manifest (inclusive `host` como objeto), se o `main` existe,
se toda referência de HTML, CSS e `require()` resolve, se não há nada remoto e
se não sobrou lixo. Roda automático no `empacotar.sh` e trava o build se falhar.

O que existe: `dist/ESQUADRO-1.0.0.ccx` e `.zip` (312 KB), e o `INSTALAR.md`.

Três caminhos, do mais simples ao mais robusto:

1. **`.ccx` por duplo clique** — Creative Cloud instala. Não é assinado pela
   Adobe, então pode aparecer aviso ou ser recusado dependendo da versão.
2. **Pasta compartilhada com o `.zip`** + `INSTALAR.md`. Previsível, mas
   atualização é manual.
3. **Adobe Exchange em listagem privada** — instalação e atualização
   automáticas, mas passa por revisão da Adobe e exige conta de desenvolvedor.

**O que continua sem teste: uma segunda máquina.** O pacote está íntegro, mas
"íntegro" não é "instala e abre no computador do colega". O que só a máquina do
outro responde: se o Creative Cloud aceita o `.ccx` sem assinatura, se a fonte
embarcada aparece numa instalação limpa, e se o caminho do Windows está certo
(escrevi pela documentação da Adobe, sem testar).

Sugestão: instalar em UMA máquina antes de mandar para todos, e usar o
`INSTALAR.md` como roteiro. Se der problema, o log UXP dessa máquina diz o
motivo — é onde achamos o `host` como array.

---

## Coisas que eu errei nesta sessão, para não repetir

- Concluí que a coordenada de guia era relativa à prancheta. Era absoluta. O
  sintoma tinha **outra causa** (a geometria das pranchetas estava quebrada) e
  eu tratei dois bugs como um.
- Afirmei que o `data_photoshop.js` estava defasado. Estava o contrário: a
  planilha fora editada **depois** do `formatos.json`, e o JSON é que estava
  velho. **Comparar mtime antes de chamar algo de defasado.**
- Recomendei portar OOH para o Photoshop sem checar o roteamento da própria
  planilha, que diz `app_photoshop: NAO`.
- Ajustei espaçamento por `gap` três rodadas seguidas sem desconfiar do motor.
