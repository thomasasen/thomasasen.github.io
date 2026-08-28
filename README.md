# thomasasen.github.io

Zentrale GitHub-Pages-Startseite für die Tools und Services von Thomas Asen.

## Live-Adresse

Nach Aktivierung von GitHub Pages:

`https://thomasasen.github.io/`

## Repository-Struktur

```text
thomasasen.github.io/
├── .nojekyll
├── 404.html
├── index.html
├── README.md
└── assets/
    ├── css/
    │   └── styles.css
    ├── icons/
    │   └── favicon.svg
    └── js/
        ├── app.js
        └── services.js
```

## GitHub Pages aktivieren

1. Repository exakt `thomasasen.github.io` nennen.
2. Repository auf GitHub erstellen.
3. Diese Dateien in den Branch `main` hochladen.
4. `Settings` → `Pages`.
5. Unter `Build and deployment`:
   - `Source`: **Deploy from a branch**
   - `Branch`: **main**
   - Folder: **/(root)**
6. `Save`.

## Services verwalten

Alle Services stehen in:

`assets/js/services.js`

### Dot Voting später freischalten

Aktuell ist Dot Voting als `planned` eingetragen:

```js
{
  title: "Dot Voting",
  status: "planned",
  url: null,
  source: null
}
```

Sobald das Repository und dessen GitHub Pages existieren:

```js
{
  title: "Dot Voting",
  status: "live",
  url: "/dot-voting/",
  source: "https://github.com/thomasasen/dot-voting"
}
```

Wenn das Dot-Voting-Repository exakt `dot-voting` heißt und dort GitHub Pages
aktiviert ist, liegt die Project Site standardmäßig unter:

`https://thomasasen.github.io/dot-voting/`

## Kein Build-Prozess

Die Seite verwendet nur HTML, CSS und Vanilla JavaScript. Es gibt:

- kein npm
- kein Node.js
- kein React
- kein Framework
- keine externe Schrift
- kein Tracking

Die leere Datei `.nojekyll` verhindert, dass GitHub Pages die Website unnötig
über Jekyll verarbeitet.
