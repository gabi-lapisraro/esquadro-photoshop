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

# Trava se o COMPORTAMENTO regrediu. O verificar-uxp cuida do CSS e o
# validar-pacote cuida do zip, mas nenhum dos dois abre o painel: a lógica de
# lista, de quantidade e de nome de arquivo mora no ui.js, e ia inteira para o
# .ccx sem ninguém conferir. A suíte é jsdom, roda em segundos e não precisa do
# Photoshop.
#
# Sem node_modules ele AVISA e segue, em vez de abortar: numa máquina recém
# clonada o `npm install` ainda não rodou, e travar o empacotamento por isso
# seria pior. Mas o aviso é barulhento de propósito — portão pulado em silêncio
# não é portão.
if [ -d tests/node_modules ]; then
  if ! ( cd tests && npm test --silent >/dev/null 2>&1 ); then
    echo "ABORTADO: a suíte de testes falhou."
    echo "Rode  cd tests && npm test  para ver o quê."
    exit 1
  fi
  echo "testes: OK"
else
  echo "AVISO: testes PULADOS — tests/node_modules não existe."
  echo "       Rode  cd tests && npm install  para ligar este portão."
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
# A OFL 1.1 exige que a licença acompanhe a fonte onde quer que ela seja
# redistribuída — e o .ccx redistribui os sete .ttf para a máquina de cada
# pessoa. 4 KB para não deixar isso em aberto.
cp fonts/LICENSE-IBMPlexMono.txt "$NOME/fonts/"

# O zip precisa ter o manifest.json na RAIZ, não dentro de uma subpasta.
( cd "$NOME" && zip -r -q "../dist/${NOME}.zip" . -x ".*" )
cp "dist/${NOME}.zip" "dist/${NOME}.ccx"
rm -rf "$NOME"

# Confere o pacote como se fosse numa máquina nova. Arquivo faltando aqui só
# apareceria no Photoshop de outra pessoa, com o painel em branco.
if ! python3 validar-pacote.py "dist/${NOME}.zip"; then
  echo "ABORTADO: o pacote não passou na validação."
  exit 1
fi

echo "gerado:"
ls -lh dist/ | awk 'NR>1{print "  " $9 "  " $5}'
echo
echo "conteúdo do pacote:"
unzip -l "dist/${NOME}.zip" | awk 'NR>3 && NF>=4 && $4!="" {print "  " $4}' | grep -v '^\s*$'
