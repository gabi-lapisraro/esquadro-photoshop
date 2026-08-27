# ESQUADЯO — estado do projeto

Documento de passagem: o que está aberto, o que não se pode quebrar, e por onde
continuar.

**Repositório:** <https://github.com/gabi-lapisraro/esquadro-photoshop>, privado.
Pasta local: `~/Downloads/esquadro-photoshop`.

**O histórico das decisões está em [`HISTORICO.md`](HISTORICO.md)** — como cada
coisa foi resolvida, o que foi tentado e falhou, e as medidas tiradas do
desenho. Este arquivo ficou com o que se consulta trabalhando; aquele, com o que
se consulta quando algo não faz sentido.

## Por onde continuar — 27/08

Tudo o que está aqui embaixo é contexto. Isto é o estado.

**Fechado na revisão de 26 para 27/08:**

- **O bug do stepper estava vivo em outros cinco lugares.** `transition: all` em
  cima de propriedade que carrega ESTADO, em `.platform-icon`, `.mode-btn`,
  `.custom-dropdown-item` e no par `.btn-primary`/`.btn-secondary`. Mesmo
  mecanismo: a classe sai, a cor não acompanha. Todos sem transição agora. O
  `.custom-dropdown-trigger` ficou com `transition: border-color`, que é hover e
  não é estado. **Sobrou visível:** a pílula do modo troca de posição na hora,
  sem esmaecer. Devolver o esmaecimento é uma linha, com o risco descrito no
  comentário da regra.
- **O "…" apagava no hover**, contra a decisão registrada aqui. Era
  especificidade: `.platform-icon:hover:not(.active)` (0,3,0) vencia
  `.btn-toggle-strip:hover` (0,2,0). Resolvido com `:not(.btn-toggle-strip)`.
- **`--acento-visivel` era a `--guide-crop` esperando a vez:** hex cravado no
  `:root`. Agora deriva de `--vermelho-raro`. E o `if (par)` do `applyTheme`
  mantinha em silêncio a companheira do tema ANTERIOR — e a companheira pinta as
  duas guias. Escreve sempre agora.
- **Os testes rodavam só nesta máquina:** cinco caminhos absolutos, e o próximo
  passo é justamente a segunda máquina. Todos relativos agora, e existe
  `npm test`.
- **O `empacotar.sh` não tinha portão de comportamento.** Agora roda a suíte e
  aborta se falhar (verificado quebrando um teste de propósito). Sem
  `node_modules` ele avisa alto e segue, para não travar clone novo.
- **`::before`/`::after` deixaram de travar o build.** Ver a seção de armadilhas.
- **Três correções neste documento**, que estava divergindo do código: o
  parágrafo da opacidade, o `noInfoBox` e o tamanho do pacote.
- **O documento foi partido em dois.** Tinha 999 linhas, e a maior parte era
  narrativa de coisa resolvida. Este ficou com o que se consulta trabalhando; o
  `HISTORICO.md` levou o porquê de cada decisão e o que falhou.
- **Saíram do versionamento**, continuando no disco: a apresentação de pitch (que
  virou repositório próprio), a exportação antiga da UI, o `gerar-playground.py`
  com o teste dele, e a logo solta em `SVG/`. Quem clonar não os encontra — é de
  propósito, e o `.gitignore` explica cada um.
- **O repositório foi refeito limpo**, com 63 commits e sem os arquivos acima em
  ponto nenhum do histórico. O histórico completo — as 126 versões originais,
  com todas as tentativas — existe **só na máquina local**, nas branches de
  backup e num bundle em `~/Downloads/`.

**Achados que NÃO virei código, de propósito:**

- Os três overlays de guia (`.guide-overlay`, `.guide-no-info`,
  `.guide-crop-overlay`) ainda têm `transition: all 0.35s`, animando `top`,
  `bottom`, `left` e `right` a cada troca de formato — exatamente o que o
  comentário do `.canvas-preview` logo acima diz para não fazer. Não é estado, é
  geometria: o risco é layout a cada quadro, não estado preso. **É decisão
  visual** — as guias deslizando entre formatos podem ser desejadas.
- `instagram-paisagem-16-9` é 1080×566, que é **1.91:1**, não 16:9 — as mesmas
  dimensões do `facebook-imagem-em-post-paisagem`, que está rotulado certo.
  Corrigir na PLANILHA, não aqui, senão o gerador desfaz.
- O `+` do stepper não consulta o `checkCapacity`: dá para chegar em 20, clicar
  CRIAR e só então tomar o erro. O teto físico já é função pura e está pronto.
- `applyGuides` duplica guias a cada clique repetido.
- A suíte não cobre o rótulo do botão (`CRIAR PRANCHETA` / `CRIAR PRANCHETAS`).
  Descobri quebrando de propósito: passou.

**Fechado antes, em 25 e 26/08:** o redesenho inteiro da UI, testado no painel; o
pacote `dist/ESQUADRO-1.0.0.{zip,ccx}`, validado; a apresentação em três
formatos (artifact publicado, PDF e PPTX); e o `INSTALAR.md` com o Windows passo
a passo.

**Nada esperando resposta do Photoshop.** A última pendência de código fechou em
27/08: a prancheta **nasce transparente**, confirmado no painel. O valor `3` de
`artboardBackgroundType`, que tinha sido deduzido da ordem das opções nas
Propriedades, estava certo.

Também confirmado em 27/08: o modo de desenvolvedor é necessário para
**instalar**, não para **usar** — ver "Distribuição".

**Aberto, em ordem de valor:**

1. **Instalar numa máquina que NUNCA teve modo de desenvolvedor ligado.** É a
   incógnita que sobrou depois do teste de 27/08: já se sabe que dá para
   desligar o modo depois de instalar; falta saber se dá para instalar sem
   nunca tê-lo ligado. Junto vai o resto do que só a máquina do colega
   responde: se a fonte embarcada aparece numa instalação limpa e se o caminho
   do Windows está certo. Ver "Distribuição".
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

Estado do pacote: `dist/ESQUADRO-1.0.0.{zip,ccx}`, 451 KB, validado, e
instalado em `~/Library/Application Support/Adobe/UXP/Plugins/External/`.
Aparece como **Plugins > ESQUADЯO > Lápis RAЯO** e abre em 264x476.

---

## Como rodar as coisas

```bash
cd ~/Downloads/esquadro-photoshop

./empacotar.sh              # gera dist/ESQUADRO-1.0.0.{zip,ccx}
./empacotar-teste.sh        # instala uma 2ª cópia, lado a lado, para testar UI
./empacotar-teste.sh --remover
python3 verificar-uxp.py    # checa CSS contra o que o UXP suporta
python3 validar-pacote.py   # extrai o zip num diretório limpo e confere tudo
python3 gerar-molduras.py   # deriva as pontas das molduras do desenho
python3 gerar-molduras.py --verificar   # o código ainda bate com o desenho?
```

A apresentação de pitch — `gerar-pdf.py`, `docs/gerar-pptx.js`,
`docs/apresentacao.html` e `docs/assets/painel.png` — saiu deste repositório em
26/08, para o [`esquadro-apresentacao`](https://github.com/gabi-lapisraro/esquadro-apresentacao).
A ferramenta de calibração de tokens saiu em 27/08, por não ser do build; ela
continua no disco. Ver `HISTORICO.md`.

Instalação manual: copiar a pasta para
`~/Library/Application Support/Adobe/UXP/Plugins/External/` e **reiniciar o
Photoshop** (ele só varre essa pasta ao iniciar). Ver `INSTALAR.md`.

Os testes estão em `tests/` e usam jsdom — carregam o `index.html` e o
`data_photoshop.js` reais e exercitam o `ui.js` sem precisar do Photoshop:

```bash
cd tests && npm install   # uma vez
node test.js && node test_prefs.js && node test_molduras.js
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

**`::before` e `::after` saíram desta lista em 26/08.** Estavam como ERRO e
travavam o empacotamento, e a crença de que não existiam foi o que levou a
moldura a ser fatiada em três SVGs. A Adobe documenta os dois como suportados
desde o UXP 3.0. Nunca testamos no painel, então viraram AVISO, não permissão —
o que mudou é que uma crença não verificada deixou de bloquear o build. **A
moldura fatiada funciona e não há razão para reescrevê-la.**

E a documentação da Adobe não resolve isto sozinha: ela lista `opacity` como
suportado enquanto a página da própria propriedade diz que o Photoshop não
suporta, e omite 13 propriedades que este painel usa e das quais depende
(`position`, `box-sizing`, `line-height`, `box-shadow`, `transition`, `border`).
Sinal fraco nas duas direções. O cabeçalho do `verificar-uxp.py` explica.

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
- **`reserva_*` → área central centralizada** (é o `noInfoBox`). **Código morto
  de verdade: NENHUM formato do `data_photoshop.js` usa.** Esta linha dizia que
  o `youtube-capa-do-canal-16-9` usava; não usa mais, e ficaram órfãos a `<div>`
  do index.html, ~20 linhas do `updatePreview` e uma regra de CSS. Ou o gerador
  volta a emitir o campo, ou os três saem.

O que falta na planilha: o rótulo da guia (`cropName`: "Corte Feed" / "Visível
no Mobile") só existe no `data_photoshop.js`.

**Cuidado:** `app_photoshop` digitado à mão na planilha é descartado — o
`derivar()` recalcula a partir de `tipo_midia`. Para incluir peça no Photoshop,
muda-se o `tipo_midia`.

**OOH não vai para o Photoshop:** as 6 peças são `Impresso`, `app_photoshop:
NAO`, e pertencem ao Illustrator. O ícone está no painel a pedido, e cai no
estado vazio (tratado: botões travam, nada chega ao Photoshop).

---

## Regras que o código aplica hoje

Cada uma tem um motivo, e o motivo está em `HISTORICO.md`. Mexer numa delas sem
ler o porquê já custou retrabalho aqui.

**Lista de formatos**

- A lista **desloca** por `margin-top` negativo; ela não rola. `overflow: hidden`
  com `scrollTop` não funciona no painel.
- Não há indicador de rolagem. Seis versões de barra foram tentadas e nenhuma
  funcionou no UXP.
- Movem a lista a roda e o arrasto. O arrasto vale depois de 4px e cancela o
  clique.
- O item tem `flex-shrink: 0`, senão os itens são comprimidos em vez de
  transbordar.
- A caixa tem altura **máxima**, não fixa. `--alt-lista` é teto de preferência;
  o teto físico é o espaço até os botões, escrito por `limitarLista`. Vence o
  menor.
- O item ativo e o item base têm a mesma borda — a do base é transparente. Sem
  isso, marcar um item mudava a altura em 2px.

**Ordem e quantidade**

- `ORDEM_DE_USO` põe feed, story, reels e perfil no topo, nessa ordem.
- `ORDEM_PROPORCAO` é a ordem de proporção geral;
  `ORDEM_PROPORCAO_POR_BASE` sobrepõe por plataforma. Só o `meta_ads` usa.
- `MAX_PRANCHETAS` guarda o teto por id de formato — hoje só o
  `meta-ads-retrato-4-5`, com 1. É regra de veiculação. O limite por largura de
  canvas é outro e mora no `checkCapacity`.
- Trocar de formato **baixa** a quantidade se ela passar do teto do formato
  novo.

**Nome do arquivo**

```
#TAЯEFA_IG_FEED_2508   documento
1  2  3                pranchetas, uma por cópia pedida
```

- A nomenclatura vale só para o **documento**. A prancheta leva só o número.
- `Я` é o cirílico U+042F. Data é DDMM do dia da criação.
- `PLATFORM_ABBR` e `FORMAT_ABBR` em `js/ui.js` controlam as abreviações.
- Quadrado, Retrato e Paisagem viram `FEED` nas redes sociais, mas não no
  Google Ads.

**Guias**

- A **linha de corte sai só na primeira prancheta**; a área segura vai em todas.
  Vale só no `createArtboards` — o Aplicar Guias é livre.
- As duas guias saem na **companheira do tema**, lida de `--companheira` direto
  no CSS. Não existe variável de guia separada.
- Coordenada de guia é **absoluta**, medida do canvas.

**Cores e tema**

| Principal | Companheira (= as duas guias) |
|---|---|
| Vermelho | Nude |
| Azul | Vermelho |
| Rosa | Azul |
| Nude | Rosa |

- A principal preenche o botão de criar e os sinais do stepper. A companheira
  marca o modo ativo, o ícone da plataforma ativa, o wordmark e as guias.
- O tema define **duas variáveis na raiz** e o CSS resolve o resto. **Zero
  escrita de cor inline no JS** — estilo inline vence qualquer regra de CSS e
  desfazia todo ajuste no `styles.css`.
- **Nenhum texto do painel é branco puro.** A escala toda sai do Nude Raro. Isso
  inclui o texto sobre o acento, que dá 3,6:1 sobre o Vermelho — abaixo do AA
  para texto pequeno, e é decisão de marca.
- As quatro bolinhas ficam iguais e cheias. A classe `.active` é posta pelo JS
  mas não pinta nada; serve para o JS ler o `data-par`.

**CSS**

- O CSS é dirigido por **59 tokens** com comentário `/* Grupo | Rótulo */`.
  **Manter esse formato importa:** é por ele que a ferramenta de calibração
  monta os controles, e um token sem ele fica sem slider.
- O raio do item da lista é **calculado** da altura dele, não é token. A
  entrelinha é explícita (`1.28`) para a altura ser calculável.
- O canvas do preview **mede o palco** (`clientWidth`/`clientHeight`), com
  84x108 como rede caso o UXP devolva 0.
- `html`, `body` e `.panel-container` são `height: 100%`. Quem cede altura é o
  palco.

---

## Como o plugin aparece no Photoshop

```
Plugins > ESQUADЯO > Lápis Яaro
```

O `name` do manifest é o que vira o item do menu; o `label` do entrypoint é o
painel dentro dele.

**Não existe como tirar o nível do meio.** O manifesto v5 não tem chave para
isso: o Photoshop monta `Plugins > nome do plugin > painel` por conta. O pedido
era só `Plugins > Lápis Raro`, e o que dá é escolher qual palavra fica em cada
nível.

**Confirmado no painel:** sai `Plugins > ESQUADЯO > Lápis RAЯO`. O Photoshop não
achata plugin de um painel só.

O `Я` é o cirílico U+042F, como no nome dos arquivos, e aparece **nos dois**:
no ESQUADЯO e em "RaЯo".

**É o SEGUNDO R de Raro que vira, não o primeiro** — LAPISRAЯO. Estava errado em
dois lugares (no rótulo do painel e no rodapé da apresentação, hoje no
repositório `esquadro-apresentacao`) até
ser corrigido em 26/08. O `aria-label` do wordmark em vetor diz só "LAPISRARO",
sem o cirílico, porque ali quem desenha a letra virada é o próprio vetor.

**Achado no caminho: `preferredDockSize` não existe.** A chave certa é
`preferredDockedSize`, com o "ed". A errada ficou no manifest sem fazer nada, e
o Photoshop **ignorou calada** — a mesma armadilha do CSS, agora no JSON. O
painel agora abre em 264×476, que é o tamanho em que a UI foi calibrada.

O `validar-pacote.py` passou a conferir as chaves do entrypoint contra a lista
do manifesto v5, e **trava o empacotamento** se achar uma que não existe. Testei
recolocando a chave errada: ele pega.

## Em estudo: formatos DIFERENTES no mesmo arquivo

Para o futuro: em vez de N cópias do mesmo formato, um documento com
pranchetas de formatos diferentes — o Feed, o Story e o Reels da mesma campanha
lado a lado.

O que já está pronto para isso: o `createArtboards` já posiciona prancheta por
prancheta, somando `left`, e já desenha guia por prancheta com o offset dela. A
mudança de assinatura é pequena — receber uma LISTA de formatos em vez de um
formato e uma contagem.

**A guia horizontal NÃO é o problema que eu supus.** Eu tinha escrito aqui que
ela atravessaria o canvas e cortaria as pranchetas vizinhas ao meio. Não é isso
que acontece no Photoshop: **as guias das outras pranchetas ficam ATRÁS da
prancheta selecionada.** Quem trabalha numa prancheta vê as guias dela.

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
observação no painel sugere que sim.

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

O que existe: `dist/ESQUADRO-1.0.0.ccx` e `.zip`, e o `INSTALAR.md`.

### O modo de desenvolvedor NÃO precisa ficar ligado — CONFIRMADO em 27/08

Testado no painel: com o plugin já instalado em
`~/Library/Application Support/Adobe/UXP/Plugins/External/`, **desligar o modo
de desenvolvedor e reiniciar o Photoshop não faz o plugin sumir.** Ele continua
aparecendo e operando.

O teste foi feito com **Sair completo** do Photoshop antes de reabrir, não
fechando a janela — no macOS fechar a janela não encerra o aplicativo, e a
varredura de plugins só roda no início de verdade. Sem isso o teste não valeria.

Isso muda o pedido ao TI de "exceção permanente de política" para "habilitar uma
vez durante a instalação". É bem mais fácil de aprovar.

**O limite deste teste:** ele prova *instalei com o modo ligado, funciona com ele
desligado*. Não prova *consigo instalar numa máquina que nunca teve o modo
ligado* — pode ser que a cópia da pasta baste, pode ser que o Photoshop precise
do modo uma vez para registrar o plugin. É o que a segunda máquina responde.

### O `.ccx` pode não ser problema de assinatura

Há uma thread no fórum da Adobe descrevendo exatamente o mesmo sintoma, no mesmo
Photoshop **27.9.1**: `.ccx` recusando instalar com "Couldn't install plugin" e
"Compatible app required", enquanto o mesmo plugin instala no Premiere e funciona
em modo de desenvolvedor.

<https://forums.creativeclouddeveloper.com/t/photoshop-27-9-1-packaged-uxp-plugin-ccx-fails-to-install-couldnt-install-plugin-compatible-app-required-premiere-fine-dev-mode-fine/12089>

A suspeita de quem abriu é a reescrita do backend de plugins do Photoshop
("Drover"), em liberação pública desde 26/07. Versão, canal beta, manifest e
cache foram descartados. **A thread está sem resolução.**

Ou seja: pode ser regressão do 27.9.1, não falta de assinatura. A mensagem de
erro distingue — "Compatible app required" aponta para o bug; aviso de origem
não verificada aponta para assinatura.

### Os caminhos, com o que se sabe hoje

1. **Pasta compartilhada com o `.zip`** + `INSTALAR.md`, com modo de
   desenvolvedor ligado só na instalação. **É o caminho viável hoje.**
   Atualização é cópia manual de pasta em cada máquina.
2. **`.ccx` por duplo clique** — não funcionou aqui. Antes de descartar, vale
   distinguir bug de assinatura pela mensagem de erro, e testar noutra versão do
   Photoshop.
3. **Adobe Exchange** — sai assinado, com instalação e atualização automáticas, e
   dispensa modo de desenvolvedor. Exige conta de desenvolvedor (Adobe ID
   pessoal serve, sem taxa documentada), perfil público de publisher com site de
   marketing, e revisão da Adobe. **Atenção:** a documentação pública descreve
   listagem no Marketplace e no Exchange, os dois **públicos** — não encontrei
   opção de listagem privada para plugin UXP. Confirmar com a Adobe antes de
   assumir que dá para distribuir só internamente.

**O que continua sem teste: uma segunda máquina.** Se a fonte embarcada aparece
numa instalação limpa, se a cópia da pasta funciona sem nunca ter ligado o modo
de desenvolvedor, e se o caminho do Windows está certo (escrito pela
documentação da Adobe, sem testar).

Se der problema, o log UXP da máquina diz o motivo — é onde achamos o `host`
como array.

---
