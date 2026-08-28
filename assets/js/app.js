(() => {
  const statusLabels = {
    live: "Verfügbar",
    beta: "Beta",
    planned: "In Vorbereitung"
  };

  const services = Array.isArray(window.SERVICES) ? window.SERVICES : [];
  const container = document.getElementById("service-list");
  const count = document.getElementById("service-count");
  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (count) {
    const liveCount = services.filter(service => service.status === "live").length;
    count.textContent =
      `${String(services.length).padStart(2, "0")} ${services.length === 1 ? "Service" : "Services"} · ` +
      `${String(liveCount).padStart(2, "0")} verfügbar`;
  }

  if (!container) return;

  container.innerHTML = services.map((service, index) => {
    const number = String(index + 1).padStart(2, "0");
    const status = statusLabels[service.status] || service.status;

    const tags = Array.isArray(service.tags) && service.tags.length
      ? `<div class="service-tags">
          ${service.tags.map(tag => `<span class="service-tag">${escapeHtml(tag)}</span>`).join("")}
         </div>`
      : "";

    const action = service.url
      ? `<a class="action-link" href="${escapeAttribute(service.url)}">Öffnen</a>`
      : `<span class="disabled-link">Demnächst</span>`;

    return `
      <article class="service ${service.url ? "is-live" : ""}">
        <div class="service-index">${number}</div>

        <div class="service-content">
          <div class="service-topline">
            <span class="service-type">${escapeHtml(service.category)}</span>
            <span class="status status-${escapeAttribute(service.status)}">${escapeHtml(status)}</span>
          </div>

          <h3>${escapeHtml(service.title)}</h3>
          <p>${escapeHtml(service.description)}</p>
          ${tags}
        </div>

        <div class="service-action">
          ${action}
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
