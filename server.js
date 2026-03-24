const express = require("express");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

// Configuración del servidor y WebSockets
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // Permite que el frontend en React se conecte sin problemas
});

// Tu nombre de usuario de TikTok
const tiktokUsername = process.env.USERNAME_TIKTOK;
//console.log(tiktokUsername)

// Si MODO_SIMULADOR es "true" en el .env, la variable será verdadera
const esSimulador = process.env.SIMULADOR === "true";

// Sistema de probabilidades (Los rangos de Fortnite)
const rangos = [
  { nombre: "Plata", probabilidad: 40 },
  { nombre: "Oro", probabilidad: 30 },
  { nombre: "Platino", probabilidad: 15 },
  { nombre: "Diamante", probabilidad: 10 },
  { nombre: "Élite", probabilidad: 4 },
  { nombre: "As", probabilidad: 1 },
  { nombre: "Unreal", probabilidad: 0.0 }, // 0.01 Probabilidad
];

// Función matemática para elegir un rango según su porcentaje
function sortearRango() {
  const random = Math.random() * 100;
  let acumulado = 0;
  for (const rango of rangos) {
    acumulado += rango.probabilidad;
    if (random <= acumulado) {
      return rango.nombre;
    }
  }
  return "Plata"; // Por defecto
}

// ==========================================
// SISTEMA DE COLA (QUEUE)
// ==========================================
let colaFollows = []; // Acá guardamos la fila de gente
let ruletaOcupada = false; // Semáforo para saber si el frontend está ocupado

if (esSimulador) {
  // --- MODO SIMULADOR ---
  console.log("🛠️ INICIANDO EN MODO SIMULADOR 🛠️");
  console.log("Esperando 5 segundos para que el frontend se conecte...");

  // Esperamos 5 segundos antes de disparar la ráfaga
  setTimeout(() => {
    console.log("¡Disparando ráfaga de 5 follows!");

    for (let index = 0; index < 5; index++) {
      const rangoGanador = sortearRango();

      colaFollows.push({
        usuario: "TestUser_" + Math.floor(Math.random() * 1000),
        rango: rangoGanador,
      });

      // Intentamos procesar la fila
      procesarCola();
    }
  }, 5000);
} else {
  // --- MODO TIKTOK LIVE ---
  console.log("📡 INICIANDO EN MODO TIKTOK LIVE 📡");

  // Crear la conexión a TikTok
  const tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

  // Escuchar cuando alguien da Follow
  tiktokLiveConnection.on("follow", (data) => {
    console.log(`¡${data.uniqueId} te ha seguido! Entrando a la fila...`);

    // Sorteamos el rango apenas llega el follow
    const rangoGanador = sortearRango();

    // Lo empujamos al final de la fila (array)
    colaFollows.push({
      usuario: data.uniqueId,
      rango: rangoGanador,
    });

    // Intentamos procesar la fila
    procesarCola();
  });

  // Envolvemos la conexión en una función para poder llamarla varias veces
  function conectarTikTok() {
    console.log(`Intentando conectar con la cuenta: @${tiktokUsername}...`);

    tiktokLiveConnection
      .connect()
      .then((state) => {
        console.info(`✅ Conectado al directo. ID de sala: ${state.roomId}`);
      })
      .catch((err) => {
        console.error(
          "❌ Error al conectar (¿El directo está apagado?). Reintentando en 60 segundos...",
        );
        console.error(err);

        // Si falla, esperamos 15 segundos (15000 ms) y volvemos a ejecutar esta misma función
        setTimeout(() => {
          conectarTikTok();
        }, 60000);
      });
  }

  // Llamamos a la función por primera vez para arrancar el ciclo
  conectarTikTok();
}

// Función que maneja los turnos
function procesarCola() {
  // Si la ruleta está en uso, o si no hay nadie en la fila, no hacemos nada
  if (ruletaOcupada || colaFollows.length === 0) {
    return;
  }
  console.log("Cola:", colaFollows);

  // Ponemos el semáforo en rojo
  ruletaOcupada = true;

  // Sacamos al primero de la fila (shift elimina el primer elemento y te lo devuelve)
  const turnoActual = colaFollows.shift();

  console.log(
    `Lanzando ruleta para: ${turnoActual.usuario} (${turnoActual.rango})`,
  );
  console.log(`Quedan ${colaFollows.length} personas en espera.`);

  // Le avisamos al frontend por WebSocket
  io.emit("girarRuleta", turnoActual);

  // ==========================================
  // EL TIEMPO DE ESPERA (Crucial)
  // ==========================================
  // Acá le decimos al backend cuánto tiempo debe esperar antes de mandar el siguiente.
  // Según nuestro frontend: 7s (giro) + 5s (cartel) + 1s (desvanecer) = ~13 segundos.
  setTimeout(() => {
    ruletaOcupada = false; // Ponemos el semáforo en verde
    procesarCola(); // Revisamos si quedó alguien más en la fila y lo lanzamos
  }, 13000);
}

// ==========================================
// INICIAR SERVIDOR
// ==========================================

const PORT = process.env.PORT || 3001;
//console.log(PORT);
server.listen(PORT, () => {
  console.log("Servidor backend corriendo en http://localhost:3001");
});
