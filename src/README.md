# Fuentes del panel

`index.html` (en la raíz) se genera con:

```
node src/build.js src/original.html index.html
```

- `original.html`: la página original de la cartera; `build.js` toma de ella estilos, datos y cálculos y los parchea.
- `statement.json`: posiciones, flujos y cifras del extracto eToro. Para un extracto nuevo, extrae su texto (por ejemplo con pypdf) y ejecuta `python src/parse_statement.py extracto.txt src/statement.json`.
- El resto (`shell.html`, `app.css`, `*.js`) son las vistas, estilos y lógica del panel.
