const moduleNames = [
  'Fundamentos do Bordado',
  'Materiais e Ferramentas',
  'Preparação do Bastidor',
  'Transferência do Risco',
  'Início sem Nós',
  'Ponto Alinhavo',
  'Ponto Atrás',
  'Ponto Haste',
  'Ponto Corrente',
  'Ponto Cheio',
  'Ponto Matiz',
  'Nó Francês',
  'Ponto Rococó',
  'Ponto Margarida',
  'Folhas e Ramos',
  'Sombra e Volume',
  'Flores Bordadas',
  'Letras e Monogramas',
  'Avesso Limpo',
  'Erros Comuns',
  'Sashiko e Pontos Rítmicos',
  'Bordado Livre',
  'Aplicação em Roupas',
  'Composição de Cores',
  'Bastidor Decorativo',
  'Pano de Prato',
  'Peça Personalizada',
  'Fotografia do Bordado',
  'Portfólio Artesanal',
  'Projeto Final'
];

const modules = moduleNames.map((title, index) => ({
  id: index + 1,
  title,
  summary: `Estudo guiado sobre ${title.toLowerCase()}, com prática progressiva e checklist de acabamento.`,
  practice: `Faça uma amostra pequena aplicando ${title.toLowerCase()} e registre o resultado antes de avançar.`
}));

const root = document.getElementById('modules');
const count = document.getElementById('count');
const search = document.getElementById('search');
const nav = document.getElementById('nav');
const statusBox = document.getElementById('status');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function moduleCard(module) {
  return `
    <article class="module" id="modulo-${module.id}">
      <div class="module-number">Módulo ${module.id}</div>
      <h2>${escapeHtml(module.title)}</h2>
      <p>${escapeHtml(module.summary)}</p>
      <div class="practice">
        <strong>Prática:</strong> ${escapeHtml(module.practice)}
      </div>
    </article>
  `;
}

function navItem(module) {
  return `<a href="#modulo-${module.id}">${String(module.id).padStart(2, '0')} — ${escapeHtml(module.title)}</a>`;
}

function render(list = modules) {
  root.innerHTML = list.map(moduleCard).join('');
  nav.innerHTML = list.map(navItem).join('');
  count.textContent = `${list.length} módulo${list.length === 1 ? '' : 's'}`;
  statusBox.textContent = list.length
    ? 'Módulos carregados com sucesso.'
    : 'Nenhum módulo encontrado para a busca.';
}

function filterModules() {
  const query = search.value.trim().toLowerCase();
  const filtered = modules.filter(module => {
    return module.title.toLowerCase().includes(query)
      || module.summary.toLowerCase().includes(query)
      || module.practice.toLowerCase().includes(query);
  });
  render(filtered);
}

search.addEventListener('input', filterModules);
render();
