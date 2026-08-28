/*
 * Zentrale Service-Liste.
 *
 * Einen neuen Service hinzufügen:
 * 1. Diesen Block kopieren.
 * 2. Titel, Beschreibung, Status und Links anpassen.
 *
 * Dot Voting später freischalten:
 * - status: "planned"  -> status: "live"
 * - url: null          -> url: "/dot-voting/"
 * - source: null       -> source: "https://github.com/thomasasen/dot-voting"
 */

window.SERVICES = [
  {
    title: "Dot Voting",
    category: "Decision Tool",
    description:
      "Voting-Budgets berechnen, Priorisierungen strukturieren und Ergebnisse auf Stabilität prüfen.",
    status: "planned",
    url: null,
    source: null,
    tags: ["Voting", "Priorisierung", "Analyse"]
  }

  /*
  Beispiel für einen späteren zweiten Service:

  ,{
    title: "PDF → EPUB",
    category: "Utility",
    description:
      "PDF-Dokumente für E-Reader aufbereiten und als EPUB ausgeben.",
    status: "beta",
    url: "/pdf2epub/",
    source: "https://github.com/thomasasen/pdf2epub",
    tags: ["Documents", "EPUB"]
  }
  */
];
