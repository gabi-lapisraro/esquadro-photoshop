# ESQUADЯO — estado do projeto

Documento de passagem. Lido em 25/08/2026, fim do dia; retomado em 25/08 à
noite, quando o redesenho dos SVGs foi implementado.
Projeto: `~/Downloads/esquadro-photoshop`, git com histórico completo.

---

## O que é

Plugin UXP para Photoshop que cria pranchetas e guias dos formatos de mídia
social, a partir do Guia de Formatos Digitais da LAPISRARO.

**Funciona e está instalado.** Todos os caminhos de código já rodaram no
Photoshop 27.9.1 pelo menos uma vez, verificados por log.

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

## As três armadilhas do UXP que custaram o dia

Estas explicam metade dos commits. O motor do UXP entende um **subconjunto** do
CSS e **descarta o resto em silêncio**: sem erro, sem log. E nada disso aparece
em navegador, Figma ou playground, porque lá o CSS funciona inteiro.

| Armadilha | Sintoma | Solução |
|---|---|---|
| `gap` em flexbox é ignorado | "ainda está tudo colado", 3 rodadas | espaçamento só por `margin` |
| `outline` não segue `border-radius` | anel quadrado em bolinha redonda | `box-shadow`, ou `border` com `border-box` |
| CSS remoto não carrega | fonte da marca sumia | `@font-face` local, `.ttf` embarcado |

Também sem suporte: **CSS Grid**, `::before`/`::after`, `float`, `clip-path`,
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

## Nomenclatura dos arquivos

```
#TAЯEFA_IG_FEED_2508          documento
#TAЯEFA_IG_FEED_2508_1 _2 _3  pranchetas, quando há mais de uma
```

`Я` é o cirílico U+042F, referência à marca. Data é DDMM **do dia da criação**.
`PLATFORM_ABBR` e `FORMAT_ABBR` em `js/ui.js` controlam as abreviações.
Quadrado, Retrato e Paisagem viram `FEED` nas redes sociais, mas não no Google
Ads, onde descrevem display ad.

---

## UI: onde parou

O CSS é dirigido por **61 tokens** com comentário `/* Grupo | Rótulo */`, que o
`gerar-playground.py` lê para montar os controles. O `playground.html` roda o
painel **de verdade** (JS real, embrulhado num `require` de mentira) e só mexe
em propriedades que o UXP suporta.

O tema define **duas variáveis na raiz** e o CSS resolve o resto. Zero escrita
de cor inline no JS — isso foi refatorado de propósito: estilo inline vence
qualquer regra de CSS e desfazia todo ajuste no `styles.css`.

**Combinações de cor** (lidas dos 4 SVGs em `UI Illustrator/`):

| Principal | Companheira |
|---|---|
| Vermelho | Azul |
| Azul | Vermelho |
| Rosa | Azul |
| Nude | Rosa |

A principal preenche o botão de criar e os sinais do stepper. A companheira
marca o modo ativo, o ícone da plataforma ativa, a guia de corte e o wordmark.

### O redesenho dos SVGs, implementado em 25/08 à noite

Os 4 arquivos em `UI Illustrator/` mostram o desenho alvo. **Revisados em
25/08 22:15**, depois de ela alterá-los: o cabeçalho deixou de ser um balão
PREENCHIDO com "ESQUADЯO" em Noir, e virou um **cartão contornado** (traço
Nude, fundo do painel) com "ESQUADЯO" **na cor do tema**.

Os quatro pontos foram feitos:

1. **Duas molduras com recorte em Я** — uma no topo com ESQUADЯO, outra na base
   com LAPISЯARO + BRAND INTELLIGENCE + as bolinhas. O cabeçalho único deixou
   de existir; a assinatura virou rodapé de verdade, colada na base do painel.
2. **Controles em pílula.** `--raio-controle` foi para 999px. Orgânico e
   Anúncio saíram da caixa segmentada e viraram duas pílulas soltas, do mesmo
   tamanho do stepper: os três terços do desenho.
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

### Duas divergências entre o desenho e o código, para ela decidir

Nenhuma das duas foi mexida: as duas contrariam decisão que já estava tomada, e
decisão de design é dela.

1. **O `1.svg` discorda da própria tabela de cores.** Nos 4 desenhos a guia de
   corte segue a tabela acima (Vermelho→Azul, Azul→Vermelho, Rosa→Azul,
   Nude→Rosa). Mas no `1.svg` — e só nele — o modo ativo, o ícone da plataforma
   ativa e o wordmark saem em **Nude**, não em Azul. Nos outros três esses
   mesmos elementos seguem a companheira certinho. Ou o tema Vermelho marca a
   seleção em Nude de propósito, ou o `1.svg` ficou para trás. O código segue a
   tabela, como estava.

2. **Os botões de ação.** No desenho, CRIAR PRANCHETA vem **preenchido** com a
   principal e APLICAR GUIAS **contornado** na principal. No painel os dois são
   contornados e sem cor, com o acento só no hover — decisão tomada no commit
   "Botões lado a lado, contornados, com o acento só no hover", com a razão
   escrita no CSS: o painel em repouso fica calmo. O desenho é mais antigo que
   essa decisão nesse ponto. Ficou como está.

### Tokens que mudaram de valor com o redesenho

Todos calibrados para bater com a proporção do desenho na largura simulada do
playground. São tokens: ela mexe no playground se quiser outra coisa.

| Token | Antes | Agora | Por quê |
|---|---|---|---|
| `--alt-logo` | 12px | 21,5px | proporção do ESQUADЯO no desenho |
| `--raio-controle` | 0 | 999px | pílula |
| `--esp-modo-stepper` | 4px | 5,5px | folga entre as três pílulas, do desenho |
| `--esp-corpo-base` | 39px | 8px | não precisa mais reservar espaço de rodapé |
| `--alt-moldura-topo` | — | 56px | novo |
| `--alt-moldura-base` | — | 38px | novo |
| `--esp-abaixo-rodape` | — | 18px | novo |

O `stroke-width` das pontas, no `index.html`, está em `0.88` — calibrado para
dar 1px nessas duas alturas, que é a espessura da borda do miolo. Mexer MUITO
nas alturas afina ou engrossa o traço da ponta sem mexer no do miolo.

### Pedidos abertos do último ciclo

- Rodapé em fonte pequena (5,5px hoje); decisão dela se sobe.

Resolvidos em 25/08, no fim: o playground ganhou campo numérico sem teto ao
lado de cada slider (digitar acima do máximo ESTICA o slider), o token morto
`--peso-modo-ativo` ganhou dono, e a cascata do CSS foi consolidada.

---

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
