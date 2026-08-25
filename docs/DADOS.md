# De onde vêm os 69 formatos

## A cadeia

```
Guia de Formatos Digitais - Consultivo 2026.xlsx   <- FONTE ÚNICA, aba "Formatos"
        │
        │  xlsx_para_json.py   (~/Downloads/Guia de Formatos - Plugin UXP/)
        ▼
formatos.json  +  formatos-photoshop.json  (+ illustrator, premiere, after-effects)
        │
        │  ainda MANUAL — não existe gerador desta etapa
        ▼
js/data_photoshop.js       <- o que o plugin carrega
```

Só a aba `Formatos` da planilha é editável. As abas por programa são vistas por
fórmula. Depois de editar, rode o `xlsx_para_json.py`.

**Estado em 25/08/2026:** o `data_photoshop.js` bate com a planilha em 69 de 69
formatos, zero divergência de margem ou dimensão. Mas a última etapa é manual —
editar a planilha **não** atualiza o plugin sozinho.

## Roteamento por app

Quem decide se a peça aparece no Photoshop é a coluna `tipo_midia`, via a
`REGRA_APP` do `xlsx_para_json.py`:

| `tipo_midia` | PS | AI | PR | AE |
|---|---|---|---|---|
| Estático | sim | sim | — | sim |
| Estático ou Vídeo | sim | sim | sim | sim |
| Vídeo | — | — | sim | sim |
| Vetor | — | sim | — | — |
| Impresso | — | sim | — | — |

O gerador **recalcula** as colunas `app_*` a partir do `tipo_midia` e ignora o
que estiver digitado nelas. Escrever `SIM` à mão em `app_photoshop` não tem
efeito — foi o que aconteceu em 24/08 com Reels, TikTok For You e Stickers.
Para incluir uma peça no Photoshop, mude o `tipo_midia`.

Em 25/08/2026 foi feito exatamente isso, na planilha:

- `instagram-videos-e-reels-9-16`: `Vídeo` → `Estático ou Vídeo`
- `tiktok-for-you-post-9-16`: `Vídeo` → `Estático ou Vídeo`
- `whatsapp-stickers-1-1`: `Vetor` → `Estático` (é peça raster — WEBP, com arte
  de origem em PNG ou GIF, segundo o próprio guia)

Photoshop foi de 66 para 69 formatos. As três fórmulas de `app_photoshop` que
estavam sobrescritas com texto foram restauradas.

## Como a margem virá guia

A planilha tem quatro colunas de margem: `margem_topo`, `margem_base`,
`margem_esq`, `margem_dir`. O plugin as usa de dois jeitos, e a regra que separa
os dois foi validada nas 23 peças de Photoshop que têm margem, sem divergência:

- **Só lateral** (`margem_esq`/`margem_dir` preenchidas, topo e base vazias)
  → **linha de corte** (`crop.lateral`). É o recorte que a plataforma faz.
- **Qualquer margem de topo ou base** → **área segura** (`safe`).

`reserva_largura`/`reserva_altura` são área central a preservar. Hoje só o
`youtube-capa-do-canal-16-9` usa, convertida em `safe` centralizada
(1546×423 em 2560×1440 → 508/508/507/507).

O rótulo da guia (`cropName`: "Corte Feed", "Visível no Mobile") **só existe no
`data_photoshop.js`** — não tem coluna na planilha. É o que falta para a última
etapa virar automática.

## Pendências

1. **Escrever o gerador `formatos.json` → `js/data_*.js`.** Enquanto não
   existir, editar a planilha exige atualizar o dataset à mão.
2. **Coluna de rótulo da guia** na planilha, ou uma tabela de rótulos dentro do
   gerador.
3. **`data_illustrator.js`, `data_premiere.js`, `data_aftereffects.js`** estão de
   uma geração antiga e ficaram fora do pacote. O de Illustrator tem o OOH em
   medida errada (`6×3` em vez de `6,10×3,05 m`, RGB em vez de CMYK) — não usar
   como referência.
4. **Reels/TikTok pedem guia de recorte própria.** O guia diz que a prévia no
   feed é 1080×1440 e que esse recorte *não* coincide com a margem de segurança.
   Hoje o plugin não modela isso.
