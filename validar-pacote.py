#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Valida o pacote gerado como se fosse numa máquina nova.

Por que existe: o pacote é o que chega na mão de outra pessoa, e um arquivo
faltando só aparece quando o painel abre em branco no Photoshop dela. Aqui o
zip é extraído num diretório limpo e conferido do zero.

O que confere:
  1. manifest no formato que o Photoshop 27 exige — inclusive `host` como
     OBJETO, que já impediu o plugin de carregar uma vez;
  2. toda referência de arquivo do HTML, do CSS e dos require() resolve;
  3. nada remoto, que o UXP não busca;
  4. nenhum arquivo de sobra.

Uso:  python3 validar-pacote.py [caminho/do.zip]
Sem argumento, pega o zip mais recente de dist/.
"""

import json
import os
import pathlib
import re
import sys
import tempfile
import zipfile

RAIZ = pathlib.Path(__file__).parent


def achar_zip():
    dist = RAIZ / "dist"
    zips = sorted(dist.glob("*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
    return zips[0] if zips else None


def conferir(destino):
    problemas = []

    def v(cond, msg):
        print(("  ok    " if cond else "  FALHA ") + msg)
        if not cond:
            problemas.append(msg)

    # ---- 1. manifest ----
    mpath = destino / "manifest.json"
    if not mpath.exists():
        v(False, "manifest.json na raiz do pacote")
        return problemas
    m = json.loads(mpath.read_text(encoding="utf-8"))
    v(m.get("manifestVersion") == 5, "manifestVersion 5")
    v(isinstance(m.get("host"), dict),
      "host é OBJETO — como array o Photoshop 27 aborta o parse do manifest inteiro")
    v(isinstance(m.get("host"), dict) and m["host"].get("app") == "PS", "host.app = PS")
    v(bool(m.get("id")) and m.get("id", "").count(".") >= 2,
      f"id em DNS reverso: {m.get('id')}")
    eps = m.get("entrypoints") or []
    v(len(eps) > 0 and eps[0].get("type") == "panel", "entrypoint do tipo panel")

    # ---- 2. o main existe ----
    main = m.get("main", "index.html")
    v((destino / main).exists(), f"main existe: {main}")

    # ---- 3. referências ----
    refs = set()
    for nome in (main, "styles.css"):
        f = destino / nome
        if not f.exists():
            continue
        txt = f.read_text(encoding="utf-8")
        refs |= set(re.findall(r'(?:src|href)="([^"]+)"', txt))
        refs |= set(re.findall(r"url\(\s*['\"]?([^'\")]+)", txt))
    for js in destino.glob("js/*.js"):
        for r in re.findall(r'require\(\s*["\'](\./[^"\']+)["\']', js.read_text(encoding="utf-8")):
            refs.add(r.lstrip("./"))

    remotas = [r for r in refs if r.startswith(("http://", "https://", "//"))]
    v(not remotas, f"nenhuma referência remota (o UXP não busca) — {remotas or ''}")

    faltando = [r for r in refs
                if not r.startswith(("http", "//", "data:")) and not (destino / r).exists()]
    v(not faltando, f"{len(refs)} referências resolvem — faltando: {faltando or 'nenhuma'}")

    # ---- 4. sobras ----
    lixo = [str(p.relative_to(destino)) for p in destino.rglob("*")
            if p.is_file() and (p.name.startswith(".") or p.suffix in (".bak", ".map")
                                or p.name == "playground.html")]
    v(not lixo, f"sem arquivos de sobra — {lixo or ''}")

    return problemas


def main():
    alvo = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else achar_zip()
    if not alvo or not alvo.exists():
        print("nenhum zip encontrado. Rode ./empacotar.sh antes.")
        return 1

    print(f"validando {alvo.name} ({alvo.stat().st_size // 1024} KB)\n")
    with tempfile.TemporaryDirectory() as tmp:
        destino = pathlib.Path(tmp)
        with zipfile.ZipFile(alvo) as z:
            z.extractall(destino)
        problemas = conferir(destino)

    print()
    if problemas:
        print(f"FALHOU: {len(problemas)} problema(s). O pacote não está pronto para distribuir.")
        return 1
    print("OK: o pacote está íntegro e pronto para instalar noutra máquina.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
