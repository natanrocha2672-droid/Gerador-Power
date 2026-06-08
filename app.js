const names=['Fundamentos','Materiais','Bastidor','Risco','Inicio sem nos','Alinhavo','Ponto atras','Ponto haste','Ponto corrente','Ponto cheio','Ponto matiz','No frances','Rococo','Margarida','Folhas','Sombra','Flores','Letras','Avesso','Erros','Sashiko','Livre','Roupas','Cores','Bastidor decorativo','Pano de prato','Peca personalizada','Fotografia','Portfolio','Projeto final'];
const modules=names.map((n,i)=>({id:i+1,title:n}));
const root=document.getElementById('modules');
const count=document.getElementById('count');
const search=document.getElementById('search');
function card(m){return `<article class="module"><div class="module-number">Modulo