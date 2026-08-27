// Fotografa os valores computados dos elementos-chave, para provar que uma
// limpeza de CSS não mudou nada visualmente.
const fs=require("fs"), path=require("path");
const {JSDOM}=require(path.join(__dirname,"node_modules/jsdom"));
const R=path.join(__dirname,"..");
let html=fs.readFileSync(R+"/index.html","utf8");
const css=fs.readFileSync(R+"/styles.css","utf8").replace(/@font-face \{[^}]*\}/g,"");
html=html.replace('<link rel="stylesheet" href="styles.css">',"<style>"+css+"</style>")
         .replace(/<script[^>]*><\/script>/g,"");
const d=new JSDOM(html).window;
const doc=d.document;
["--companheira","--sobre-companheira","--acento-visivel","--vermelho-raro"].forEach(t=>{});
const alvos=[".mode-btn",".stepper-btn",".platform-icon",".btn-primary",".btn-secondary",
             ".custom-dropdown-trigger",".header-wordmark",".color-dot",".legend-row",
             ".panel-header",".panel-body",".preview-card",".header-meta"];
const props=["background-color","color","font-weight","font-size","height","width","padding",
             "margin","border","border-radius","opacity","display","flex-direction",
             "justify-content","align-items","flex"];
const saida={};
for(const sel of alvos){
  const el=doc.querySelector(sel); if(!el) continue;
  const cs=d.getComputedStyle(el);
  saida[sel]=Object.fromEntries(props.map(p=>[p,cs.getPropertyValue(p)]));
}
// e o estado ativo do modo, que é onde estavam as 3 regras empilhadas
const ma=doc.querySelector(".mode-btn.active");
if(ma) saida[".mode-btn.active"]=Object.fromEntries(props.map(p=>[p,d.getComputedStyle(ma).getPropertyValue(p)]));
console.log(JSON.stringify(saida,null,1));
