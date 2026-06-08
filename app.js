const course = window.COURSE_DATA || { modules: [] };

const nav = document.querySelector("#nav");
const modulesEl = document.querySelector("#modules");
const search = document.querySelector("#search");

function safe(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function list(items) {
  return `<ul>${(items || []).map(item => `<li>${safe(item)}</li>`).join("")}</ul>`;
}

function render(filter = "") {
  const term = filter.trim().toLowerCase();

  const modules = course.modules.filter(module => {
    const text = `${module.title} ${module.summary} ${module.content}`.toLowerCase();
    return text.includes(term);
  });

  nav.innerHTML = modules
    .map(module => `<a href="#modulo-${module.id}">${module.id}. ${safe(module.title)}</a>`)
    .join("");

  modulesEl.innerHTML = modules.map(module => `
    <article class="module" id="modulo-${module.id}">
      <p class="meta">Módulo ${module.id}</p>
      <h2>${safe(module.title)}</h2>
      <p>${safe(module.summary)}</p>

      <div class="grid">
        <section class="box">
          <h3>Objetivos</h3>
          ${list(module.objectives)}
        </section>

        <section class="box">
          <h3>Materiais</h3>
          ${list(module.materials)}
        </section>
      </div>

      <section>
        <h3>Aula pronta</h3>
        <p>${safe(module.content)}</p>
      </section>

      <section>
        <h3>Prática</h3>
        <p>${safe(module.practice)}</p>
      </section>

      <section>
        <h3>Checklist</h3>
        ${list(module.checklist)}
      </section>
    </article>
  `).join("");
}

search.addEventListener("input", event => render(event.target.value));
render();
