const { masterPlatforms } = require("./js/data_photoshop.js");
const UI = require("./js/ui.js");
const PhotoshopAPI = require("./js/photoshop.js");

// Inicialização do UXP
try {
  const uxp = require("uxp");
  if (uxp && uxp.entrypoints) {
    uxp.entrypoints.setup({
      plugin: {
        create() {
          console.log("ESQUADЯO plugin criado.");
        }
      },
      panels: {
        esquadroPanel: {
          show() {
            console.log("ESQUADЯO painel exibido.");
          }
        }
      }
    });
  }
} catch (e) {
  console.log("Fora do ambiente UXP nativo.");
}

function startApp() {
  try {
    UI.init({
      data: masterPlatforms,
      onCreateArtboards: PhotoshopAPI.createArtboards,
      onApplyGuides: PhotoshopAPI.applyGuides
    });
  } catch (err) {
    // Sem isso, uma exceção no init deixa o painel em branco e sem pista
    // nenhuma de causa — o erro só apareceria no log UXP do Photoshop.
    console.error("[ESQUADRO] Falha ao iniciar o painel:", err);
    const msg = (err && err.message) ? err.message : String(err);
    document.body.innerHTML =
      '<div style="padding:16px;font-family:monospace;font-size:11px;color:#f0918a;">' +
      '<b>ESQUADЯO não conseguiu iniciar.</b><br><br>' + msg +
      '<br><br><span style="color:#999">Detalhes no log UXP do Photoshop.</span></div>';
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
