# ESQUADЯO

Plugin UXP para Adobe Photoshop que cria pranchetas e guias de área segura e
linha de corte para os formatos de mídia social, a partir do **Guia de Formatos
Digitais** da LAPISRARO.

O problema que ele resolve: a peça sai com o texto na faixa que o Instagram
corta, e ninguém percebe até estar publicado. O guia de formatos tem a medida
certa de todas as peças; o que faltava era ela chegar ao arquivo antes de
alguém começar a desenhar.

**Estado:** funciona e está instalado. Todos os caminhos de código já rodaram no
Photoshop 27.9.1, verificados por log. 69 formatos, 14 plataformas.

---

## Instalar

```
Plugins > ESQUADЯO > Lápis RAЯO
```

Duplo clique em `dist/ESQUADRO-1.0.0.ccx` (o Creative Cloud instala), ou
instalação manual copiando a pasta para o diretório de plugins UXP e
**reiniciando o Photoshop** — ele só varre essa pasta ao iniciar.

Passo a passo, macOS e Windows: **[`INSTALAR.md`](INSTALAR.md)**.

## Desenvolver

```bash
./empacotar.sh              # gera dist/ESQUADRO-<versão>.{zip,ccx}
cd tests && npm install     # uma vez
cd tests && npm test        # suíte jsdom, não precisa do Photoshop
```

`empacotar.sh` roda três portões e **aborta** se algum falhar:

| Portão | O que ele impede |
|---|---|
| `verificar-uxp.py` | CSS que o UXP descarta em silêncio entrar no pacote |
| `npm test` (jsdom) | regressão de comportamento no painel chegar ao `.ccx` |
| `validar-pacote.py` | pacote quebrado — extrai o zip num diretório limpo e confere |

## O que NÃO está aqui

Estes ficam de fora do git de propósito, e o `.gitignore` explica cada um:

- **`dist/`** — gerado por `empacotar.sh`.
- **A apresentação de pitch** — não é engenharia do plugin, é material para
  conversa interna. Mora em outro repositório privado:
  [`esquadro-apresentacao`](https://github.com/gabi-lapisraro/esquadro-apresentacao).
- **`.env`** — se você usar o MCP do GitHub, o token mora aí. Nunca versionado.

## Como ler este repositório

| Arquivo | Para quê |
|---|---|
| **[`docs/ESTADO.md`](docs/ESTADO.md)** | comece aqui: armadilhas do UXP, regras que o código aplica, bugs a não reintroduzir, e o que está aberto |
| [`docs/HISTORICO.md`](docs/HISTORICO.md) | o porquê de cada decisão, e o que foi tentado e falhou. Consulta, não leitura |
| [`docs/DADOS.md`](docs/DADOS.md) | a cadeia planilha → JSON → `js/data_photoshop.js` |
| [`INSTALAR.md`](INSTALAR.md) | instalação para quem vai usar |

```
index.html + styles.css     o painel
js/main.js                  entrada, entrypoints do UXP
js/ui.js                    toda a lógica de painel (lista, quantidade, nome do arquivo)
js/photoshop.js             a fronteira com a API do Photoshop (batchPlay)
js/data_photoshop.js        os 69 formatos
```

Os outros `js/data_*.js` são de Illustrator, Premiere e After Effects. **Não
entram no pacote** — o `main.js` carrega só o do Photoshop.

## A coisa mais importante a saber

**O motor do UXP entende um subconjunto do CSS e descarta o resto em silêncio.**
Sem erro, sem log, sem nada. E não aparece em navegador nem no playground,
porque lá o CSS funciona inteiro — só o painel do Photoshop responde.

É por isso que existe o `verificar-uxp.py`, que trava o empacotamento, e é por
isso que cada regra dele declara a própria confiança: CONFIRMADO (visto
quebrando aqui), DOCUMENTADO (limitação conhecida, não testada por nós) ou
IRREGULAR. A documentação da Adobe **não** substitui isso: ela lista `opacity`
como suportado enquanto a página da própria propriedade diz que o Photoshop não
suporta, e omite 13 propriedades das quais este painel depende.

A tabela completa das armadilhas, com sintoma e solução de cada uma, está na
seção "As armadilhas do UXP" do [`docs/ESTADO.md`](docs/ESTADO.md).

## Para revisão de distribuição

**O plugin não acessa a rede.** Nenhum `fetch`, `XMLHttpRequest`, `WebSocket`
nem URL remota no código. O `validar-pacote.py` **falha o build** se qualquer
referência remota entrar — é portão, não promessa. As fontes são embarcadas
justamente porque o UXP não busca recurso remoto.

**Não declara nenhuma permissão.** O `manifest.json` não tem
`requiredPermissions`: o plugin não pede rede, sistema de arquivos, área de
transferência nem nada além de operar no documento aberto.

**O único dado que persiste são 4 preferências de interface** — plataforma,
modo, formato e cor de tema — em `localStorage`, na chave `esquadro.prefs.v1`.
Não guarda conteúdo de documento, nome de arquivo, nem qualquer dado de quem
usa. Nada sai da máquina.

**O que ele faz no Photoshop:** cria documento e pranchetas, e adiciona guias.
Não altera preferências do aplicativo, não instala nada fora da própria pasta,
não abre nem salva arquivos.

**Lacuna conhecida, para constar:** o `manifest.json` declara
`minVersion: 23.0.0`, mas o plugin só foi testado no **Photoshop 27.9.1**. As
versões entre 23 e 27 não foram verificadas. Se a política for suportar só o que
foi testado, o `minVersion` deve subir.

Os três caminhos de distribuição avaliados (`.ccx` por duplo clique, pasta
compartilhada com o `.zip`, e Adobe Exchange em listagem privada) estão na seção
"Distribuição" do [`docs/ESTADO.md`](docs/ESTADO.md), com o que falta em cada um.

## Licenças de terceiros

**IBM Plex Mono** (`fonts/*.ttf`) é distribuída sob a **SIL Open Font License
1.1** — ver [`fonts/LICENSE-IBMPlexMono.txt`](fonts/LICENSE-IBMPlexMono.txt).
Os arquivos são embarcados no pacote porque o UXP não carrega CSS nem fonte
remota.

Os ícones de plataforma em `index.html` são desenhos de marcas de terceiros,
usados para identificar o destino de cada formato.

## Licença

Copyright © 2026 **LAPISRARO**. Todos os direitos reservados — ver
[`LICENSE`](LICENSE). Autoria: Gabriella Felisberto, para a LAPISRARO.

---

Marca, wordmark e sistema de cores: **LAPISRARO — Brand Intelligence**.
