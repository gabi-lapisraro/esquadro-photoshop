# Testes

Suíte headless em jsdom: carrega o `index.html` e o `data_photoshop.js` reais e
exercita o `ui.js` sem precisar do Photoshop. Pega regressão de ligação,
estado vazio, nomenclatura, tema e preferências.

```bash
cd tests && npm install jsdom   # uma vez
node test.js            # suíte principal
node test_prefs.js      # o painel reabre na última escolha
node test_playground.js # o playground sobe e reage
```

O que ela NÃO cobre: qualquer coisa que dependa do motor do UXP. jsdom é um
navegador, e navegador entende CSS que o Photoshop descarta. Para isso existe o
`verificar-uxp.py`, e depois dele o teste no painel de verdade.
