# thomasasen.github.io

Zentrale GitHub-Pages-Seite für Tools und Services von Thomas Asen.

## Veröffentlichung

Repository:

`thomasasen/thomasasen.github.io`

GitHub Pages:

`Settings → Pages → Deploy from a branch → main → /(root)`

Live-Adresse:

`https://thomasasen.github.io/`

## Dateien

```text
.
├── .nojekyll
├── 404.html
├── index.html
├── README.md
└── assets
    ├── css
    │   └── styles.css
    ├── icons
    │   └── favicon.svg
    └── js
        ├── app.js
        └── services.js
```

## Aktuelle Services

### Dot Voting – Rechner & Qualitätsprüfung

Live:

`https://thomasasen.github.io/dot-voting-calculator/`

Repository:

`https://github.com/thomasasen/dot-voting-calculator`

Der Rechner unterstützt eine K-Approval-basierte Empfehlung für die Punktzahl pro Person, Strukturprüfung, individuelle Voting-Erfassung, Ranking, Tie-Erkennung an der Top-W-Grenze sowie eine Single-Ballot-/Leave-one-out-Stabilitätsprüfung.

### Gantt Studio

Live:

`https://thomasasen.github.io/gantt-studio/`

Repository:

`https://github.com/thomasasen/gantt-studio`

Browserbasierte Projektplanung für Projektportfolios und Roadmaps mit Aufgaben, Abhängigkeiten, Phasen, Gates, Baselines, Risiken, mehreren Ansichten sowie lokalem Import und Export. Projekt- und Planungsdaten werden lokal im Browser gespeichert.

## Neue Services ergänzen

Neue Tools werden in `assets/js/services.js` als weitere Einträge in `window.SERVICES` ergänzt.

Beispiel:

```js
{
  title: "Neues Tool",
  category: "Utility",
  description: "Kurze Beschreibung des Nutzens.",
  status: "live",
  url: "/repository-name/",
  source: "https://github.com/thomasasen/repository-name"
}
```

## Cache

`index.html` lädt CSS und JavaScript mit einer Versionsnummer:

```html
styles.css?v=3.0.4
services.js?v=3.0.4
app.js?v=3.0.4
```

Bei Änderungen an ausgelieferten Assets die Versionsnummer erhöhen. Das reduziert Probleme durch ältere Browser- oder CDN-Caches.
