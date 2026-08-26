#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deriva as PONTAS das molduras a partir do desenho, em `UI Illustrator/1.svg`.

POR QUE ISSO EXISTE
-------------------
As duas molduras do painel — a do ESQUADЯO em cima, a da assinatura embaixo —
têm o recorte em Я. No UXP não há clip-path nem ::before/::after, e `border` não
sabe seguir um caminho arbitrário. Então a moldura é fatiada em três:

    [ ponta esquerda ]===== miolo que estica =====[ ponta direita ]

As PONTAS são SVG de largura fixa, no index.html: carregam o recorte e desenham
o traço com `stroke`. O MIOLO é uma div com border-top e border-bottom, e é ela
que absorve a largura do painel, que muda quando o usuário redimensiona.

Este script faz o corte. Sem ele, mexer no desenho vira transcrição à mão de
número com duas casas decimais — que é exatamente o tipo de etapa manual que
apodrece calada (ver a cadeia da planilha em docs/ESTADO.md).

USO
---
    python3 gerar-molduras.py              mostra o que o desenho pede
    python3 gerar-molduras.py --verificar  compara com index.html e styles.css

`--verificar` sai com 1 se o que está no código não bate mais com o desenho.
Não trava o empacotamento de propósito: reexportar o SVG com uma moldura nova é
trabalho normal, não acidente. O que ele responde é "o código já acompanhou?".

COMO O CORTE FUNCIONA
---------------------
O miolo é onde as DUAS retas longas existem ao mesmo tempo. Na moldura de baixo
a linha de cima e a de baixo são deslocadas entre si, então a sobra de cada uma
volta para dentro da ponta — senão o traço ficaria faltando um pedaço.

Tudo o que o CSS precisa sai em proporção da ALTURA da moldura, para a ponta
nunca distorcer quando essa altura mudar no playground.
"""

import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).parent
DESENHO = RAIZ / "UI Illustrator" / "1.svg"

# Espessura de referência do traço, em unidades do desenho. Só serve para o
# viewBox sobrar meia espessura de cada lado e o traço não sair cortado.
TRACO = 1.0

# As duas molduras, na ordem em que aparecem no desenho.
NOMES = ["topo", "base"]

# Como cada ponta se chama no index.html e no styles.css.
CLASSES = {
    ("topo", "esq"): "ponta-topo-esq",
    ("topo", "dir"): "ponta-topo-dir",
    ("base", "esq"): "ponta-base-esq",
    ("base", "dir"): "ponta-base-dir",
}


# --------------------------------------------------------------------------
# leitura do path
# --------------------------------------------------------------------------

def parse(d):
    """Path do Illustrator -> lista de segmentos em coordenada ABSOLUTA.

    Só o subconjunto que o export usa: M l h v c s. As cúbicas suaves (`s`)
    viram cúbicas completas, refletindo o controle anterior."""
    t = re.findall(r"[MmLlHhVvCcSsZz]|-?\d*\.?\d+(?:e-?\d+)?", d)
    i = 0
    cmd = None
    x = y = sx = sy = px2 = py2 = 0.0
    segs = []

    def n():
        nonlocal i
        v = float(t[i])
        i += 1
        return v

    while i < len(t):
        if re.match(r"[A-Za-z]", t[i]):
            cmd = t[i]
            i += 1
        c = cmd
        ax, ay = x, y
        pts = None
        if c in "Mm":
            a, b = n(), n()
            x, y = (a, b) if c == "M" else (x + a, y + b)
            sx, sy = x, y
            cmd = "L" if c == "M" else "l"
            kind = "M"
        elif c in "Ll":
            a, b = n(), n()
            x, y = (a, b) if c == "L" else (x + a, y + b)
            kind = "L"
        elif c in "Hh":
            a = n()
            x = a if c == "H" else x + a
            kind = "L"
        elif c in "Vv":
            a = n()
            y = a if c == "V" else y + a
            kind = "L"
        elif c in "Cc":
            v = [n() for _ in range(6)]
            if c == "c":
                v = [ax + v[0], ay + v[1], ax + v[2], ay + v[3], ax + v[4], ay + v[5]]
            pts = v
            x, y = v[4], v[5]
            px2, py2 = v[2], v[3]
            kind = "C"
        elif c in "Ss":
            v = [n() for _ in range(4)]
            if c == "s":
                v = [ax + v[0], ay + v[1], ax + v[2], ay + v[3]]
            c1 = (2 * ax - px2, 2 * ay - py2) if segs and segs[-1][0] == "C" else (ax, ay)
            pts = [c1[0], c1[1], v[0], v[1], v[2], v[3]]
            x, y = v[2], v[3]
            px2, py2 = v[0], v[1]
            kind = "C"
        elif c in "Zz":
            x, y = sx, sy
            kind = "L"
        else:
            sys.exit("comando de path não tratado: " + c)
        segs.append((kind, (ax, ay), (x, y), pts))
    return segs[1:]          # fora o M inicial, que não desenha nada


def caixa(segs, passos=64):
    """Caixa do TRAÇADO, amostrando as cúbicas.

    Usar os pontos de controle inflaria a caixa: eles ficam fora da curva, e a
    ponta sairia posicionada torta por causa de uma folga que não existe."""
    pts = []
    for kind, a, b, p in segs:
        pts.append(a)
        if p:
            x0, y0 = a
            x1, y1, x2, y2, x3, y3 = p
            for i in range(1, passos):
                t = i / passos
                u = 1 - t
                pts.append((u**3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t**3 * x3,
                            u**3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t**3 * y3))
        pts.append(b)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def num(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def escrever(segs, dx, dy):
    """Segmentos -> path absoluto, transladado para a origem do viewBox."""
    out = [f"M{num(segs[0][1][0] - dx)},{num(segs[0][1][1] - dy)}"]
    for kind, a, b, p in segs:
        if kind == "C":
            out.append("C" + ",".join(num(v - (dx if j % 2 == 0 else dy))
                                      for j, v in enumerate(p)))
        else:
            out.append(f"L{num(b[0] - dx)},{num(b[1] - dy)}")
    return "".join(out)


# --------------------------------------------------------------------------
# o corte
# --------------------------------------------------------------------------

def cortar(d, nome):
    segs = parse(d)
    # a reta longa às vezes sai como `s` no export; vale o traçado, não o comando
    longas = [i for i, (k, a, b, p) in enumerate(segs)
              if abs(a[1] - b[1]) < 0.3 and abs(a[0] - b[0]) > 20]
    if len(longas) != 2:
        sys.exit(f"moldura {nome}: esperava 2 retas longas, achei {len(longas)}. "
                 "O desenho mudou de forma; este script precisa de revisão.")
    i_topo, i_base = sorted(longas)
    topo, base = segs[i_topo], segs[i_base]
    x_topo = sorted([topo[1][0], topo[2][0]])
    x_base = sorted([base[1][0], base[2][0]])
    y_topo, y_base = topo[1][1], base[1][1]

    # o miolo é onde as duas retas coexistem; a sobra volta para a ponta
    x_ini, x_fim = max(x_topo[0], x_base[0]), min(x_topo[1], x_base[1])

    def reta(x0, x1, y):
        return ("L", (x0, y), (x1, y), None)

    esq = segs[i_topo + 1:i_base]
    if x_topo[0] < x_ini:
        esq = [reta(x_ini, x_topo[0], y_topo)] + esq
    if x_base[0] < x_ini:
        esq = esq + [reta(x_base[0], x_ini, y_base)]

    dir_ = segs[i_base + 1:] + segs[:i_topo]
    if x_base[1] > x_fim:
        dir_ = [reta(x_fim, x_base[1], y_base)] + dir_
    if x_topo[1] > x_fim:
        dir_ = dir_ + [reta(x_topo[1], x_fim, y_topo)]

    return dict(nome=nome, esq=esq, dir=dir_, x_ini=x_ini, x_fim=x_fim,
                altura=y_base - y_topo)


def descrever(corte, lado):
    segs = corte[lado]
    x0, y0, x1, y1 = caixa(segs)
    pad = TRACO / 2
    vx, vy = x0 - pad, y0 - pad
    vw, vh = (x1 - x0) + TRACO, (y1 - y0) + TRACO

    # os dois pontos onde a ponta encosta no miolo
    pa, pb = segs[0][1], segs[-1][2]
    ys = sorted([pa[1], pb[1]])
    alt = ys[1] - ys[0]                     # eixo a eixo: é essa a referência

    # quanto a ponta avança POR CIMA do miolo para o traço encostar sem emenda.
    # Inclui a meia espessura de folga do viewBox e, quando existe, o recorte
    # que passa do ponto de encontro.
    x_enc = max(pa[0], pb[0]) if lado == "esq" else min(pa[0], pb[0])
    avanca = (vw - (x_enc - vx)) if lado == "esq" else (x_enc - vx)

    return dict(
        classe=CLASSES[(corte["nome"], lado)],
        viewBox=f"0 0 {vw:.2f} {vh:.2f}",
        d=escrever(segs, vx, vy),
        largura=vw / alt,
        altura=vh / alt,
        sobe=(ys[0] - vy) / alt,
        avanca=avanca / alt,
        eixo_a_eixo=alt,
    )


def derivar():
    svg = DESENHO.read_text(encoding="utf-8")
    corpo = svg.split("</defs>")[1]
    # as molduras são o único traço solto sem preenchimento no desenho
    paths = re.findall(r'<path class="cls-1"[^>]*d="([^"]+)"', corpo)
    if len(paths) != 2:
        sys.exit(f"esperava 2 molduras em {DESENHO.name}, achei {len(paths)}")

    tudo = {}
    for d, nome in zip(paths, NOMES):
        c = cortar(d, nome)
        pontas = {lado: descrever(c, lado) for lado in ("esq", "dir")}
        # a ponta esquerda é mais larga que a direita, então o centro do miolo
        # não é o centro da moldura: o miolo devolve a diferença em padding
        sobra = ((pontas["esq"]["largura"] - pontas["esq"]["avanca"])
                 - (pontas["dir"]["largura"] - pontas["dir"]["avanca"]))
        tudo[nome] = dict(pontas=pontas, padding_miolo=sobra, eixo_a_eixo=c["altura"])
    return tudo


# --------------------------------------------------------------------------
# saída
# --------------------------------------------------------------------------

def mostrar(tudo):
    for nome, m in tudo.items():
        print(f"\n########## MOLDURA {nome.upper()} ##########")
        print(f"  eixo a eixo no desenho: {m['eixo_a_eixo']:.2f} unidades")
        print(f"  miolo: padding-right = calc(var(--linha) * {m['padding_miolo']:.4f})")
        for lado, p in m["pontas"].items():
            print(f"\n  .{p['classe']}")
            print(f"    viewBox=\"{p['viewBox']}\"")
            print(f"    width:        calc(var(--linha) * {p['largura']:.4f});")
            print(f"    height:       calc(var(--linha) * {p['altura']:.4f});")
            print(f"    margin-top:   calc(var(--meia-borda) - var(--linha) * {p['sobe']:.4f});")
            lado_css = "margin-right" if lado == "esq" else "margin-left"
            print(f"    {lado_css}: calc(var(--linha) * -{p['avanca']:.4f});")
            print(f"    d=\"{p['d']}\"")


def verificar(tudo):
    html = (RAIZ / "index.html").read_text(encoding="utf-8")
    css = (RAIZ / "styles.css").read_text(encoding="utf-8")
    problemas = []

    for nome, m in tudo.items():
        for lado, p in m["pontas"].items():
            cls = p["classe"]
            bloco = re.search(r'<svg class="moldura-ponta ' + cls +
                              r'" viewBox="([^"]+)">\s*<path d="([^"]+)"', html)
            if not bloco:
                problemas.append(f"{cls}: não achei o SVG no index.html")
                continue
            if bloco.group(1) != p["viewBox"]:
                problemas.append(f"{cls}: viewBox no código é "
                                 f"\"{bloco.group(1)}\", o desenho pede \"{p['viewBox']}\"")
            if bloco.group(2) != p["d"]:
                problemas.append(f"{cls}: o caminho não bate com o desenho")

            regra = re.search(r"\." + cls + r"\s*\{([^}]*)\}", css)
            if not regra:
                problemas.append(f"{cls}: não achei a regra no styles.css")
                continue
            esperado = {
                "width": p["largura"], "height": p["altura"],
                "margin-top": p["sobe"],
                ("margin-right" if lado == "esq" else "margin-left"): p["avanca"],
            }
            for prop, valor in esperado.items():
                achado = re.search(prop + r"\s*:[^;]*?([\d.]+)\s*\)\s*;", regra.group(1))
                if not achado:
                    problemas.append(f"{cls}: não li `{prop}` na regra")
                elif abs(float(achado.group(1)) - valor) > 0.0001:
                    problemas.append(f"{cls}: {prop} está {achado.group(1)}, "
                                     f"o desenho pede {valor:.4f}")

        pad = re.search(r"\.moldura-" + nome +
                        r" \.moldura-meio \{[^}]*padding-right:[^;]*?([\d.]+)\s*\)", css)
        if pad and abs(float(pad.group(1)) - m["padding_miolo"]) > 0.0001:
            problemas.append(f"moldura {nome}: padding do miolo está {pad.group(1)}, "
                             f"o desenho pede {m['padding_miolo']:.4f}")

    if problemas:
        print("O código não acompanha mais o desenho:\n")
        for p in problemas:
            print("  " + p)
        print("\nRode sem --verificar para ver os valores novos.")
        return 1
    print("As molduras no código batem com o desenho.")
    return 0


def main():
    tudo = derivar()
    if "--json" in sys.argv:
        print(json.dumps(tudo, indent=1, ensure_ascii=False))
        return 0
    if "--verificar" in sys.argv:
        return verificar(tudo)
    mostrar(tudo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
