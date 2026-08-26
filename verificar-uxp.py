#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verifica o CSS contra o que o UXP do Photoshop realmente suporta.

Por que existe: o motor do UXP entende um subconjunto do CSS. O que ele não
entende é DESCARTADO EM SILÊNCIO — sem erro, sem aviso, sem nada no log. E nada
disso aparece em navegador, no Figma ou no playground, porque lá o CSS funciona
inteiro. Só aparece no painel, depois de reiniciar o Photoshop.

Em 25/08/2026 esse buraco custou o dia:
  - `gap` em flexbox ignorado: três rodadas de "ainda está tudo colado", porque
    eu ajustava um valor que o Photoshop jogava no lixo.
  - `outline` não seguindo border-radius: anel quadrado num elemento redondo.
  - fonte por @import remoto: caía calada no monospace do sistema.

Em 26/08, no primeiro teste do redesenho no painel:
  - `border-radius: 999px` virando elipse: o UXP encolhe os dois raios
    separadamente, então o botão saiu oval e o texto vazou para fora.

Uso:
    python3 verificar-uxp.py             verifica e lista
    python3 verificar-uxp.py --silencioso  só o código de saída

Sai com 1 se houver ERRO, para poder travar o empacotamento.
"""

import re
import sys
import pathlib

RAIZ = pathlib.Path(__file__).parent

# Nível de confiança de cada regra, dito na cara:
#   CONFIRMADO — visto quebrando neste projeto, no Photoshop 27.9.1
#   DOCUMENTADO — limitação conhecida do UXP, não testada por nós aqui
#   IRREGULAR  — suporte varia por versão; funciona mas não dá para confiar

ERROS = [
    (r"(?<![-\w])(?:row-|column-)?gap\s*:", "CONFIRMADO",
     "`gap` é ignorado em flexbox. Use margin."),
    (r"@import\b", "CONFIRMADO",
     "O UXP não busca CSS remoto. Embarque o arquivo e use @font-face local."),
    (r"url\(\s*['\"]?https?://", "CONFIRMADO",
     "Recurso remoto não carrega. Embarque no pacote."),
    (r"border-radius\s*:[^;]*?(?<![.\d])\d{3,}px", "CONFIRMADO",
     "border-radius gigante (o truque do 999px) vira ELIPSE no UXP: ele encolhe "
     "os dois raios separadamente, e sai rx=largura/2 com ry=altura/2. Para "
     "pílula, use metade da ALTURA do próprio elemento."),
    (r"outline\s*:", "CONFIRMADO",
     "`outline` não segue border-radius: sai quadrado em elemento redondo. Use box-shadow."),
    (r"display\s*:\s*(?:inline-)?grid", "DOCUMENTADO",
     "CSS Grid não é suportado. Use flex com base fixa."),
    (r"(?<![-\w])grid-(?:template|area|column|row|gap|auto)", "DOCUMENTADO",
     "Propriedade de Grid, sem suporte."),
    (r"::(?:before|after)\b", "DOCUMENTADO",
     "Pseudo-elementos ::before e ::after não são suportados. Use um elemento real."),
    (r"(?<![-\w])float\s*:", "DOCUMENTADO",
     "`float` não é suportado. Use flex."),
    (r"backdrop-filter\s*:", "DOCUMENTADO",
     "Não suportado."),
    (r"clip-path\s*:", "DOCUMENTADO",
     "Não suportado."),
    (r"mix-blend-mode\s*:", "DOCUMENTADO",
     "Não suportado."),
    (r"position\s*:\s*sticky", "DOCUMENTADO",
     "`sticky` não é suportado. Use absolute ou fixed."),
    (r":has\(", "DOCUMENTADO",
     "Seletor :has() não é suportado."),
    (r"@container\b", "DOCUMENTADO",
     "Container queries não são suportadas."),
    (r"aspect-ratio\s*:", "DOCUMENTADO",
     "Não suportado. Calcule a altura no JS, como o preview faz."),
]

AVISOS = [
    (r"flex-wrap\s*:", "IRREGULAR",
     "Suporte de flex-wrap varia. Confirme no painel antes de depender dele."),
    (r"align-content\s*:", "IRREGULAR",
     "Só age com wrap, cujo suporte é irregular."),
    (r"filter\s*:", "IRREGULAR",
     "Suporte parcial."),
    (r"box-shadow\s*:[^;]*\binset\b", "IRREGULAR",
     "Sombra interna: suporte não confirmado no UXP. Para traço interno use border com box-sizing border-box."),
    (r"position\s*:\s*fixed", "IRREGULAR",
     "`fixed` é parcial no UXP. O tooltip flutuante depende disso."),
    (r"transition\s*:[^;]*\b(?:width|height|padding|margin)\b", "IRREGULAR",
     "Animar dimensão causa recálculo de layout a cada quadro. Prefira transform e opacity."),
    (r"\d+(?:\.\d+)?v(?:h|w|min|max)\b", "IRREGULAR",
     "Unidades de viewport se comportam de forma estranha em painel encaixado."),
]

NOTAS = [
    (r"transition\s*:\s*all\b",
     "`transition: all` anima o que mudar, inclusive dimensão. Liste as propriedades."),
    (r"pointer-events\s*:\s*none",
     "Pode não impedir clique no UXP; o JS já guarda com modeLocked e actionsEnabled."),
    (r"!important", "Cada !important dificulta ajuste futuro no CSS."),
    (r"user-select\s*:", "Ignorado pelo UXP, mas inofensivo."),
    (r"cursor\s*:", "O UXP usa cursor próprio; provavelmente ignorado."),
]


def sem_comentarios(texto):
    """Remove comentários, para não acusar o que só está explicado em texto.

    Vale para os dois: /* ... */ do CSS e <!-- ... --> do HTML. Sem o segundo,
    um comentário que só EXPLICA por que não dá para usar ::before virava erro.
    A troca preserva as quebras de linha, para o número da linha não andar."""
    def apaga(m):
        return "\n" * m.group(0).count("\n")
    texto = re.sub(r"/\*.*?\*/", apaga, texto, flags=re.S)
    return re.sub(r"<!--.*?-->", apaga, texto, flags=re.S)


def liberadas(css):
    """Linhas marcadas com /* uxp-ok: motivo */ ficam de fora.

    Sem isso o relatório enche de caso deliberado, e alarme que sempre soa é
    alarme que ninguém lê."""
    return {n for n, linha in enumerate(css.split("\n"), 1) if "uxp-ok" in linha}


def varrer(caminho):
    bruto = caminho.read_text(encoding="utf-8")
    isentas = liberadas(bruto)
    css = sem_comentarios(bruto)
    linhas = css.split("\n")

    achados = []
    for nivel, regras in (("ERRO", ERROS), ("AVISO", AVISOS)):
        for padrao, confianca, recado in regras:
            for n, linha in enumerate(linhas, 1):
                if re.search(padrao, linha, re.I) and n not in isentas:
                    achados.append((nivel, n, confianca, linha.strip()[:64], recado))

    notas = []
    for padrao, recado in NOTAS:
        n = len(re.findall(padrao, css, re.I))
        if n:
            notas.append((n, recado))
    return achados, notas


def main():
    silencioso = "--silencioso" in sys.argv
    alvos = [RAIZ / "styles.css", RAIZ / "index.html"]
    erros = 0

    for alvo in alvos:
        if not alvo.exists():
            continue
        achados, notas = varrer(alvo)
        graves = [a for a in achados if a[0] == "ERRO"]
        erros += len(graves)

        if silencioso:
            continue

        print(f"\n{alvo.name}")
        if not achados and not notas:
            print("  nada a apontar")
        for nivel, n, confianca, trecho, recado in sorted(achados, key=lambda a: (a[0] != "ERRO", a[1])):
            marca = "ERRO " if nivel == "ERRO" else "aviso"
            print(f"  {marca} linha {n:<4} [{confianca}] {trecho}")
            print(f"        {recado}")
        for n, recado in notas:
            print(f"  nota  {n}x  {recado}")

    if not silencioso:
        print(f"\n{'FALHOU: ' + str(erros) + ' erro(s)' if erros else 'OK: nenhum erro'}")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())
