# thomasasen.github.io

Zentrale GitHub-Pages-Startseite für Tools und Services.

## Veröffentlichung

GitHub:

`Settings → Pages → Deploy from a branch → main → /(root)`

Live:

`https://thomasasen.github.io/`

## Dot Voting später aktivieren

Datei:

`assets/js/services.js`

Ändern von:

```js
status: "planned",
url: null,
source: null,
```

auf:

```js
status: "live",
url: "/dot-voting/",
source: "https://github.com/thomasasen/dot-voting",
```
