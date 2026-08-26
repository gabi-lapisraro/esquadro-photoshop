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

4. Abra o Photoshop e vá em **Plugins → Lápis RAЯO**.

### Windows

**É o mesmo pacote.** Não existe versão para Mac e versão para Windows: o plugin
é HTML, CSS e JavaScript, e nada dentro dele olha para o sistema. Todos os
caminhos internos são relativos e com barra normal — que ali é URL, não caminho
de disco, e funciona igual nos dois. O que muda entre os sistemas é **só onde a
pasta é largada**.

1. Feche o Photoshop.
2. Descompacte o `ESQUADRO-1.0.0.zip`.
3. Aperte **Win + R**, cole o caminho abaixo e dê Enter — o Explorer abre a pasta
   certa, sem precisar caçar o `AppData`, que é oculto:

```
%APPDATA%\Adobe\UXP\Plugins\External
```

4. Solte **a pasta** descompactada ali dentro. Se `External` não existir, crie
   com esse nome exato.
5. Abra o Photoshop e vá em **Plugins → Lápis RAЯO**.

#### O que costuma dar errado no Windows

Em ordem de probabilidade:

1. **Pasta dentro de pasta.** O "Extrair tudo" do Windows costuma criar
   `ESQUADRO-1.0.0\ESQUADRO-1.0.0\`. O que tem que ir para `External` é a
   pasta que contém o `manifest.json` **na raiz**. Se o manifest estiver um nível
   mais fundo, o Photoshop não vê o plugin e não reclama de nada.
2. **A pasta `External` não existe.** É comum: ela só aparece depois do primeiro
   plugin manual. Crie com o nome exato, sem espaço nem acento.
3. **Não reiniciou o Photoshop.** Ele varre a pasta só ao iniciar.
4. **Arquivo bloqueado.** Zip que veio por download pode chegar marcado como "de
   origem externa". Antes de extrair: clique direito no `.zip` → Propriedades →
   marque **Desbloquear** → OK.
5. **Modo de desenvolvedor desligado.** Plugin sem assinatura da Adobe na pasta
   `External` pode exigir isso: **Photoshop → Preferências → Plugins → Ativar
   modo de desenvolvedor**, e reiniciar.
6. **Photoshop antigo.** Precisa de 23.0 ou superior.

> **O que ainda não foi verificado:** nada disto foi testado numa máquina Windows
> de verdade. O caminho e o procedimento são os documentados pela Adobe, e o
> pacote é o mesmo que roda no macOS — mas a primeira instalação no Windows é o
> teste. Se falhar, o log daquela máquina responde: procure em `%APPDATA%\Adobe\`
> a pasta da versão do Photoshop e, dentro dela, `Logs`. Mande as linhas que
> citarem `esquadro`.

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

## Precisa de uma versão por sistema?

**Não.** Um pacote só serve os dois, e ajustar algo para o Windows não coloca o
macOS em risco — porque não há o que ajustar no plugin. Não existe detecção de
sistema, nem caminho de disco, nem separador de pasta em lugar nenhum do código:
o que o `index.html` e o `styles.css` referenciam é relativo, e o
`require("./js/…")` é resolvido pelo próprio UXP.

A diferença entre os sistemas mora **neste arquivo**, não no plugin: é a pasta
onde a pasta do plugin é largada. Mudar a documentação não pode quebrar código.

---

## Como usar

1. Escolha a plataforma na fileira de ícones. O **…** abre a segunda fileira
   (Google Ads, Meta Ads, X, Uber, iFood).
2. Alterne **Orgânico / Anúncio**. Em plataformas que só existem em um dos
   modos, o outro fica travado.
3. Escolha o formato no menu e a quantidade de pranchetas no stepper.
4. **Criar Prancheta** monta o documento com as pranchetas lado a lado e já
   desenha as guias. A área segura vai em todas; a **linha de corte só na
   primeira**. **Aplicar Guias** desenha tudo no documento aberto, respeitando a
   prancheta ativa, sem essa restrição.

As quatro cores no rodapé trocam o tema do painel em tempo real.

Na lista de formatos aberta: **role com a roda do mouse** ou **arraste a própria
lista**. Ela não tem barra de rolagem de propósito — a barra nativa do Photoshop
não se deixa esconder nem afinar, e ficava feia.

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
