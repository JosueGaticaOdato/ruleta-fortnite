# 🎰 TikTok Live - Ruleta de Rangos de Fortnite

Un widget interactivo en tiempo real para transmisiones de TikTok Live. Cada vez que un espectador le da "Follow" a la cuenta, se dispara automáticamente una ruleta fluida (estilo apertura de cajas de CSGO) que sortea un rango de Fortnite. 

Diseñado específicamente para retener a la audiencia, fomentar las interacciones y gamificar los directos. Optimizado para resoluciones verticales (ej: 800x1000) en OBS Studio o TikTok Live Studio.

## ✨ Características

- **Conexión en Tiempo Real:** Escucha los eventos de TikTok Live sin necesidad de APIs oficiales complejas.
- **Animación CSGO-Style:** Física de aceleración y frenado realista usando transiciones CSS avanzadas.
- **Probabilidades Ajustables:** Sistema matemático en el backend para que los rangos más altos (como *Unreal*) sean premios raros y exclusivos.
- **Modo Espera Animado:** Cuando no hay un follow reciente, muestra un "Call to Action" flotante e impactante.
- **Fondo Transparente y Máscaras CSS:** Se integra perfectamente sobre el *gameplay* con bordes difuminados.
- **Cero Latencia:** Se ejecuta localmente en tu PC mientras transmites.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React (Vite), CSS3 puro (Flexbox, animaciones y CSS Masks).
- **Backend:** Node.js, Express.
- **WebSockets:** Socket.io (comunicación bidireccional instantánea).
- **Conector TikTok:** `tiktok-live-connector`.

---

## 🚀 Instalación y Uso

Este proyecto se divide en dos partes: el **Servidor Backend** (que escucha a TikTok) y el **Frontend Visual** (la ruleta). Debes ejecutar ambos simultáneamente.

### Requisitos Previos
- Tener [Node.js](https://nodejs.org/) instalado en tu computadora.
- Las 7 imágenes de los rangos de Fortnite en formato PNG con fondo transparente (Plata, Oro, Platino, Diamante, Élite, As, Unreal).

### Paso 1: Configurar el Backend

1. Abre una terminal y navega a la carpeta del backend.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Abre el archivo `server.js` y edita la variable `tiktokUsername` con tu nombre de usuario (sin el @):
   ```javascript
   const tiktokUsername = 'TU_USUARIO_AQUI';
   ```
4. Inicia el servidor:
   ```bash
   node server.js
   ```
   *Nota: El backend incluye un simulador (intervalo de 15s) para pruebas. Recuerda comentarlo o borrarlo antes de entrar en directo.*

### Paso 2: Configurar el Frontend

1. En otra ventana de tu terminal, navega a la carpeta del frontend (Vite).
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Coloca tus imágenes de los rangos en la carpeta `src/assets/rangos/` con los nombres exactos (`plata.png`, `oro.png`, etc.).
4. Inicia el entorno de desarrollo:
   ```bash
   npm run dev
   ```

### Paso 3: Integración en OBS / TikTok Live Studio

1. Abre tu software de transmisión.
2. Añade una nueva **Fuente de Navegador** (Browser Source).
3. Configura la fuente con los siguientes parámetros:
   - **URL:** `http://localhost:5173` (o el puerto que te asigne Vite).
   - **Ancho:** `800`
   - **Alto:** `1000`
4. ¡Listo! Coloca la fuente sobre tu captura de juego.

---

## ⚙️ Configuración Avanzada

### Modificar Probabilidades
Puedes ajustar qué tan difícil es sacar cada rango editando el array `rangos` en el archivo `server.js`:

*(Asegúrate de que la suma de todas las probabilidades sea exactamente 100).*

### Solución de Problemas Comunes
- **El backend no se conecta a TikTok:** La librería `tiktok-live-connector` requiere que la cuenta esté **transmitiendo en vivo en ese exacto momento** para poder conectarse. Si pruebas estando offline, arrojará error.
- **La ruleta frena en el rango equivocado:** Asegúrate de no haber alterado los anchos (`width`) de las cajas en CSS sin actualizar la fórmula matemática en `App.jsx`.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - siéntete libre de usarlo, modificarlo y compartirlo.