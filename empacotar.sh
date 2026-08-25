#!/bin/bash
# Empacota o ESQUADЯO para distribuição.
#
# Gera dois artefatos em dist/:
#   ESQUADRO-<versao>.ccx  -> instalação por duplo clique (Creative Cloud Desktop)
#   ESQUADRO-<versao>.zip  -> mesmo conteúdo, para instalação manual em modo desenvolvedor
#
# Os dois são o MESMO zip: .ccx é a extensão que o Creative Cloud reconhece.
# Uso:  ./empacotar.sh

set -euo pipefail
cd "$(dirname "$0")"

# Trava se o CSS usar algo que o UXP descarta em silêncio. Sem isso, um `gap`
# ou um @import remoto entra no pacote e só aparece depois de reiniciar o
# Photoshop, sem nenhuma pista no log.
if ! python3 verificar-uxp.py --silencioso; then
  echo "ABORTADO: o CSS tem propriedade sem suporte no UXP."
  echo "Rode  python3 verificar-uxp.py  para ver o quê."
  exit 1
fi

VERSAO=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
NOME="ESQUADRO-${VERSAO}"

rm -rf dist "$NOME"
mkdir -p dist "$NOME"

# Só o que o plugin realmente carrega. main.js requer apenas data_photoshop.js;
# os data_* dos outros apps ficam fora para não inflar o pacote nem confundir
# quem for ler o código (o data_illustrator.js tem OOH em medida antiga).
cp manifest.json index.html styles.css "$NOME/"
mkdir -p "$NOME/js" "$NOME/fonts"
cp js/main.js js/ui.js js/photoshop.js js/data_photoshop.js "$NOME/js/"
cp fonts/*.ttf "$NOME/fonts/"

# O zip precisa ter o manifest.json na RAIZ, não dentro de uma subpasta.
( cd "$NOME" && zip -r -q "../dist/${NOME}.zip" . -x ".*" )
cp "dist/${NOME}.zip" "dist/${NOME}.ccx"
rm -rf "$NOME"

echo "gerado:"
ls -lh dist/ | awk 'NR>1{print "  " $9 "  " $5}'
echo
echo "conteúdo do pacote:"
unzip -l "dist/${NOME}.zip" | awk 'NR>3 && NF>=4 && $4!="" {print "  " $4}' | grep -v '^\s*$'
