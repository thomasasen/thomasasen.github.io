(() => {
  const STATUS_LABELS = {
    live: "Verfügbar",
    beta: "Beta",
    planned: "In Vorbereitung"
  };

  const services = Array.isArray(window.SERVICES)
    ? window.SERVICES
    : [];

  const grid = document.getElementById("service-grid");
  const counter = document.getElementById("service-count");
  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (counter) {
    const total = services.length;
    const live = services.filter(
      service => service.status === "live"
    ).length;

    counter.textContent =
      `${total} ${total === 1 ? "Tool" : "Tools"} · ${live} verfügbar`;
  }

  if (!grid) {
    return;
  }

  grid.innerHTML = services.map(renderService).join("");

  function renderService(service) {
    const statusLabel =
      STATUS_LABELS[service.status] || service.status;

    const mainAction = service.url
      ? `<a class="card-link"
            href="${escapeAttribute(service.url)}">
            Tool öffnen
         </a>`
      : `<span class="card-state">Demnächst verfügbar</span>`;

    const sourceAction = service.source
      ? `<a class="source-link"
            href="${escapeAttribute(service.source)}"
            target="_blank"
            rel="noreferrer">
            GitHub ↗
         </a>`
      : "";

    return `
      <article class="service-card ${service.url ? "is-live" : ""}">
        <div class="card-header">
          <span class="service-category">
            ${escapeHtml(service.category)}
          </span>

          <span class="status status-${escapeAttribute(service.status)}">
            ${escapeHtml(statusLabel)}
          </span>
        </div>

        <div class="card-body">
          <h3>${escapeHtml(service.title)}</h3>
          <p>${escapeHtml(service.description)}</p>
        </div>

        <div class="card-footer">
          ${mainAction}
          ${sourceAction}
        </div>
      </article>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
