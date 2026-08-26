# Testes

Suíte headless em jsdom: carrega o `index.html` e o `data_photoshop.js` reais e
exercita o `ui.js` sem precisar do Photoshop. Pega regressão de ligação,
estado vazio, nomenclatura, tema e preferências.

```bash
cd tests && npm install   # uma vez
node test.js            # suíte principal
node test_prefs.js      # o painel reabre na última escolha
node test_playground.js # o playground sobe e reage
node test_molduras.js   # as molduras com recorte em Я, e o que veio com elas
```

`computados.js` fotografa os valores computados dos elementos-chave. Serve para
provar que uma limpeza de CSS não mudou nada visualmente: rode antes, rode
depois, e compare com `diff`.

O que ela NÃO cobre:

- **O motor do UXP.** jsdom é um navegador, e navegador entende CSS que o
  Photoshop descarta. Para isso existe o `verificar-uxp.py`, e depois dele o
  teste no painel de verdade.
- **Layout.** jsdom não posiciona nada, e nem busca o `styles.css` do
  `<link>`. Então `test_molduras.js` confere só a ESTRUTURA das molduras. Quem
  confere se o traço da ponta encosta no miolo é o `gerar-molduras.py
  --verificar`, comparando o código com o desenho.
