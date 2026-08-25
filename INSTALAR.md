# ESQUADЯO — instalação

Plugin de pranchetas e guias para Photoshop. Versão 1.0.0.
Requer **Photoshop 23.0 ou superior** (testado no 27.9.1 / 2026).

---

## Opção A — pasta de plugins (recomendada para a equipe)

É a via mais previsível: não depende do Creative Cloud aceitar pacote sem
assinatura, nem de instalar ferramenta de desenvolvedor.

### macOS

1. Feche o Photoshop.
2. Descompacte o `ESQUADRO-1.0.0.zip`.
3. Copie a pasta descompactada para:

```
~/Library/Application Support/Adobe/UXP/Plugins/External/
```

Se a pasta `External` não existir, crie. No Finder use **Ir → Ir para a pasta**
(`⇧⌘G`) e cole o caminho acima — a `Library` do usuário é oculta.

4. Abra o Photoshop e vá em **Plugins → ESQUADЯO — Lápis Raro**.

### Windows

Mesmo procedimento, com o caminho:

```
%APPDATA%\Adobe\UXP\Plugins\External\
```

> Verificado no macOS. No Windows o caminho é o equivalente documentado pela
> Adobe, mas não foi testado aqui — se o painel não aparecer, ver "Se não
> aparecer" abaixo.

---

## Opção B — duplo clique no `.ccx`

Dê duplo clique em `ESQUADRO-1.0.0.ccx` e o Creative Cloud Desktop instala.

Mais simples, porém o pacote **não é assinado pela Adobe**: dependendo da versão
do Creative Cloud, pode aparecer aviso de origem não verificada ou a instalação
ser recusada. Se isso acontecer, use a Opção A.

---

## Se não aparecer no menu Plugins

1. **Reinicie o Photoshop.** Ele só varre a pasta de plugins na inicialização.
2. Confira que o `manifest.json` está na **raiz** da pasta copiada, e não dentro
   de outra subpasta. A estrutura correta é:

```
External/com.lapisraro.esquadro.photoshop/
├── manifest.json
├── index.html
├── styles.css
├── js/
└── fonts/
```

3. Ative o modo de desenvolvedor: **Photoshop → Preferências → Plugins →
   "Ativar modo de desenvolvedor"**, e reinicie.
4. Leia o log — ele diz exatamente o motivo da recusa:

```bash
ls -t ~/Library/Logs/Adobe/Adobe\ Photoshop\ 2026/UXPLogs_*.log | head -1
```

Procure por linhas com `esquadro`. Erro de manifest aparece como
`Failed to parse the manifest.json file`.

---

## Como usar

1. Escolha a plataforma na fileira de ícones. O botão **+** abre a segunda
   fileira (Google Ads, Meta Ads, X, Uber, iFood).
2. Alterne **Orgânico / Anúncio**. Em plataformas que só existem em um dos
   modos, o outro fica travado.
3. Escolha o formato no menu e a quantidade de pranchetas no stepper.
4. **Criar Prancheta** monta o documento com as pranchetas lado a lado e já
   desenha as guias. **Aplicar Apenas Guias** desenha as guias no documento
   aberto, respeitando a prancheta ativa.

As cores no rodapé trocam o tema do painel em tempo real.

---

## Limites conhecidos

- **Documento de até 30.000 px.** Formatos grandes limitam a quantidade de
  pranchetas por documento; o painel avisa e informa o máximo daquele formato.
- **OOH não está aqui.** As peças de Out of Home são `Impresso` (CMYK, 300 DPI,
  escala 1:10) e pertencem ao plugin de Illustrator.
- As guias são **somadas** ao documento. Reaplicar no mesmo documento empilha
  guias duplicadas — limpe antes em **Visualizar → Limpar guias**.

---

## Dados

Os 69 formatos vêm da planilha `Guia de Formatos Digitais - Consultivo 2026.xlsx`,
aba `Formatos`, que é a fonte única. O arquivo `js/data_photoshop.js` é derivado
dela — não editar à mão. Ver [`docs/DADOS.md`](docs/DADOS.md).
