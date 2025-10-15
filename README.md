# 🌍 Juego: Países de Europa

**Juego interactivo para aprender y practicar los países de Europa**, desarrollado con **React**, **Vite** y **Tailwind CSS**.
Ideal para estudiantes, docentes o cualquier persona que quiera mejorar geografía europea de forma amena.

Puedes jugarlo Online aqui: https://eberhm.github.io/europe-countries-game/

---

## 🎯 Objetivo del juego

El mapa resalta un país en azul. Tu misión es **escribir correctamente su nombre** en el idioma seleccionado.

* ✅ **8 puntos** si aciertas al primer intento.
* ➖ Cada error resta **2 puntos** (mínimo 0).
* ❌ Con **4 errores** se revela el nombre y el país queda en rojo.
* 🔎 **Enter en blanco** hace zoom al país activo (×2, luego ×3 y a la tercera se reinicia). No cuenta como intento.

---

## 🗣️ Idiomas disponibles

* Castellano
* Català
* Valencià
* Euskara
* Galego
* Aranés

---

## 🧩 Características

* Interfaz ligera y responsive.
* Animaciones suaves (Framer Motion).
* Acepta **alias y acentos** comunes por idioma (p. ej., “Países Bajos / Holanda”).
* Puntuación en tiempo real y resumen de aciertos/errores.
* Zoom contextual sobre el país activo.

---

## 🛠️ Tecnologías

* React + Vite
* Tailwind CSS
* react-simple-maps + D3 Geo
* TopoJSON Client
* Framer Motion

---

## 🚀 Instalación

1. Clona este repo o descarga el ZIP.
2. Instala dependencias:

```bash
npm install
```

3. Arranca el entorno de desarrollo:

```bash
npm run dev
```

4. Abre la URL que imprime Vite (normalmente `http://localhost:5173`).

---

## 🏗️ Build de producción

```bash
npm run build
npm run preview
```

Los archivos optimizados quedan en `dist/`.

---

## ⚙️ Configuración y notas

* **Estilos**: el proyecto incluye Tailwind ya configurado (`tailwind.config.js`, `postcss.config.js`, `src/index.css`).
* **Mapa/zoom**: por defecto se desactiva el zoom con rueda del ratón para evitar un warning del navegador.

  * Si quieres volver a activarlo, elimina la prop `filterZoomEvent` del componente `ZoomableGroup`.

---

## 📦 Datos geográficos

* TopoJSON de Europa: proyecto público *leakyMirror/map-of-europe*.
* Se normalizan algunos nombres (p. ej., “Czech Republic” → “Czechia”, “Holy See” → “Vatican”) y se filtran países extraeuropeos.

---

## 👥 Créditos

* Mapa: comunidad open-source (TopoJSON).
* Librerías: ver sección **Tecnologías**.

---

## 📚 Licencia (MIT)

Este proyecto es **de uso libre** para fines educativos, personales o comerciales bajo la licencia MIT.

```
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
