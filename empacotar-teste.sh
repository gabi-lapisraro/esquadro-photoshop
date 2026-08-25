#!/bin/bash
# Empacota e instala uma cópia PARALELA do ESQUADЯO, para testar UI nova sem
# encostar na versão que está funcionando.
#
# O plugin de teste recebe id e nome próprios, senão o Photoshop trata os dois
# como o mesmo plugin e um sobrescreve o outro. Com ids distintos, os dois
# painéis aparecem juntos no menu Plugins e dá para comparar lado a lado.
#
# Uso:  ./empacotar-teste.sh            empacota e instala
#       ./empacotar-teste.sh --remover  desinstala a cópia de teste

set -euo pipefail
cd "$(dirname "$0")"

ID_TESTE="com.lapisraro.esquadro.photoshop.teste"
EXTERNAL="$HOME/Library/Application Support/Adobe/UXP/Plugins/External"
DEST="$EXTERNAL/$ID_TESTE"

if [ "${1:-}" = "--remover" ]; then
  rm -rf "$DEST"
  echo "cópia de teste removida. Reinicie o Photoshop."
  exit 0
fi

STAGE=".teste-build"
rm -rf "$STAGE" && mkdir -p "$STAGE/js" "$STAGE/fonts"

cp index.html styles.css "$STAGE/"
cp js/main.js js/ui.js js/photoshop.js js/data_photoshop.js "$STAGE/js/"
cp fonts/*.ttf "$STAGE/fonts/"

# manifest com id e rótulo próprios
python3 - "$STAGE" "$ID_TESTE" <<'PY'
import json, sys, collections, pathlib
stage, novo_id = sys.argv[1], sys.argv[2]
m = json.load(open("manifest.json", encoding="utf-8"),
              object_pairs_hook=collections.OrderedDict)
m["id"] = novo_id
m["name"] = m["name"] + " (teste)"
for ep in m.get("entrypoints", []):
    if "label" in ep and "default" in ep["label"]:
        ep["label"]["default"] = "ESQUADЯO TESTE — UI nova"
    if "id" in ep:
        ep["id"] = ep["id"] + "Teste"
p = pathlib.Path(stage) / "manifest.json"
json.dump(m, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(p, "a", encoding="utf-8").write("\n")
print("  id:    " + m["id"])
print("  painel: " + m["entrypoints"][0]["label"]["default"])
PY

# o id do entrypoint mudou, então o setup no main.js precisa acompanhar
python3 - "$STAGE" <<'PY'
import sys, pathlib, re
p = pathlib.Path(sys.argv[1]) / "js" / "main.js"
s = p.read_text(encoding="utf-8")
s = s.replace("esquadroPanel:", "esquadroPanelTeste:")
p.write_text(s, encoding="utf-8")
PY

rm -rf "$DEST" && mkdir -p "$DEST"
cp -R "$STAGE/." "$DEST/"
rm -rf "$STAGE"

echo "instalado em:"
echo "  $DEST"
echo
echo "Reinicie o Photoshop. Os dois painéis vão aparecer no menu Plugins:"
echo "  ESQUADЯO — Lápis Raro      (a versão que funciona)"
echo "  ESQUADЯO TESTE — UI nova   (esta cópia)"
