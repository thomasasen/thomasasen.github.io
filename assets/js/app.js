(() => {
  const statusLabels = {
    live: "Verfügbar",
    beta: "Beta",
    planned: "In Vorbereitung"
  };

  const services = Array.isArray(window.SERVICES) ? window.SERVICES : [];
  const container = document.getElementById("services");
  const count = document.getElementById("service-count");
  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (count) {
    const liveCount = services.filter(service => service.status === "live").length;
    const total = services.length;

    count.textContent =
      total === 1
        ? `01 Service · ${String(liveCount).padStart(2, "0")} verfügbar`
        : `${String(total).padStart(2, "0")} Services · ${String(liveCount).padStart(2, "0")} verfügbar`;
  }

  if (!container) return;

  container.innerHTML = services.map((service, index) => {
    const number = String(index + 1).padStart(2, "0");
    const status = statusLabels[service.status] || service.status;
    const tags = Array.isArray(service.tags) && service.tags.length
      ? `
        <div class="service-tags" aria-label="Schlagwörter">
          ${service.tags.map(tag => `<span class="service-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>`
      : "";

    const primaryAction = service.url
      ? `<a class="action-link" href="${escapeAttribute(service.url)}">Tool öffnen</a>`
      : `<span class="action-disabled">Demnächst verfügbar</span>`;

    const sourceAction = service.source
      ? `<a class="action-link action-source"
            href="${escapeAttribute(service.source)}"
            target="_blank"
            rel="noreferrer">Source</a>`
      : "";

    return `
      <article class="service-row ${service.url ? "is-live" : ""}">
        <div class="service-number">${number}</div>

        <div class="service-main">
          <div class="service-meta">
            <span class="service-category">${escapeHtml(service.category)}</span>
            <span class="status status-${escapeAttribute(service.status)}">${escapeHtml(status)}</span>
          </div>

          <h3>${escapeHtml(service.title)}</h3>
          <p>${escapeHtml(service.description)}</p>
          ${tags}
        </div>

        <div class="service-actions">
          ${primaryAction}
          ${sourceAction}
        </div>
      </article>`;
  }).join("");

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
