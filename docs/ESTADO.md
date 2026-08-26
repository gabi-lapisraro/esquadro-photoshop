# ESQUADЯO — estado do projeto

Documento de passagem. Lido em 25/08/2026, fim do dia.
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
python3 gerar-playground.py # gera playground.html a partir do index/styles reais
```

Instalação manual: copiar a pasta para
`~/Library/Application Support/Adobe/UXP/Plugins/External/` e **reiniciar o
Photoshop** (ele só varre essa pasta ao iniciar). Ver `INSTALAR.md`.

Os testes vivem no scratchpad da sessão (`test.js`, `test_prefs.js`,
`test_playground.js`, `harness.js`) e usam jsdom. **Não estão no repo** — se
forem úteis, vale movê-los para `tests/`.

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

`verificar-uxp.py` varre o CSS procurando tudo isso e **trava o empacotamento**
se achar erro. Cada regra declara a confiança: CONFIRMADO (visto quebrando
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

O CSS é dirigido por **58 tokens** com comentário `/* Grupo | Rótulo */`, que o
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

### O redesenho dos SVGs ainda NÃO foi implementado

Os 4 arquivos em `UI Illustrator/` mostram um desenho novo. O que falta:

1. **Cabeçalho em moldura-balão** com o recorte em R, na cor do tema, com
   "ESQUADЯO" em Noir.
2. **Controles em pílula** (cantos totalmente arredondados).
3. **Seletor de formato** com o nome sublinhado, sem caixa nem seta.
4. **"…"** no lugar do "+" para expandir plataformas.
5. **Rodapé em cartão com recortes**, centralizado.

**Bloqueio técnico conhecido:** a forma de balão com recorte **não** pode ser
feita com `clip-path` nem com `::before`/`::after` — nenhum dos dois existe no
UXP. O caminho é **SVG inline** como fundo do cabeçalho. Não foi testado.

### Pedidos abertos do último ciclo

- Refazer o playground: os limites dos sliders ficaram baixos demais, e ela
  quer poder digitar valores.
- `--peso-modo-ativo` está declarado e **nunca referenciado** — o slider dele
  não faz nada. Auditoria encontrou esse único token morto.
- Rodapé em 7px e 7,5px é pequeno de verdade; decisão dela.

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

Ainda **não** foi feita. O que existe: `dist/ESQUADRO-1.0.0.ccx` e `.zip`,
gerados por `./empacotar.sh`, e o `INSTALAR.md` com o passo a passo.

Três caminhos, do mais simples ao mais robusto:

1. **`.ccx` por duplo clique** — Creative Cloud instala. Não é assinado pela
   Adobe, então pode aparecer aviso ou ser recusado dependendo da versão.
2. **Pasta compartilhada com o `.zip`** + `INSTALAR.md`. Previsível, mas
   atualização é manual.
3. **Adobe Exchange em listagem privada** — instalação e atualização
   automáticas, mas passa por revisão da Adobe e exige conta de desenvolvedor.

**Nada disso foi testado numa segunda máquina.** O único ambiente verificado é
o desta, com instalação manual na pasta `External`.

Antes de distribuir, vale conferir: a fonte embarcada aparece (o `@import`
remoto já falhou uma vez), o painel abre em tela não-retina, e o `INSTALAR.md`
está atualizado para a versão empacotada.

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
