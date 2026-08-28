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

## Dot Voting später aktivieren

In `assets/js/services.js` ändern:

```js
status: "planned",
url: null,
source: null
```

zu:

```js
status: "live",
url: "/dot-voting/",
source: "https://github.com/thomasasen/dot-voting"
```

## Neue Services ergänzen

Einfach einen weiteren Eintrag in `window.SERVICES` ergänzen.

## Cache

`index.html` lädt CSS und JavaScript mit einer Versionsnummer:

```html
styles.css?v=3.0.0
services.js?v=3.0.0
app.js?v=3.0.0
```

Bei größeren Design-Änderungen die Versionsnummer erhöhen.
Das verhindert, dass Browser oder CDN eine alte Asset-Version anzeigen.
