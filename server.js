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
  { nombre: "Unreal", probabilidad: 0.00 }, // 0.01 Probabilidad
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

if (esSimulador) {
  // --- MODO SIMULADOR ---
  console.log("🛠️ INICIANDO EN MODO SIMULADOR 🛠️");

  setInterval(() => {
    console.log("Testeando: Simulando un follow automático...");
    const rangoGanador = sortearRango();

    io.emit("girarRuleta", {
      usuario: "TestUser_" + Math.floor(Math.random() * 1000),
      rango: rangoGanador,
    });
  }, 15000);
} else {
  // --- MODO TIKTOK LIVE ---
  console.log("📡 INICIANDO EN MODO TIKTOK LIVE 📡");

  // Crear la conexión a TikTok
  const tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);
  
  // Escuchar cuando alguien da Follow
  tiktokLiveConnection.on("follow", (data) => {
    console.log(`¡${data.uniqueId} te ha seguido!`);
    
    // Sorteamos el rango
    const rangoGanador = sortearRango();
    console.log(`Resultado de la ruleta: ${rangoGanador}`);
    
    // Le avisamos al frontend por WebSocket para que empiece a girar la ruleta
    io.emit("girarRuleta", {
      usuario: data.uniqueId,
      rango: rangoGanador,
    });
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
        "❌ Error al conectar (¿El directo está apagado?). Reintentando en 15 segundos...",
      );
      
      // Si falla, esperamos 15 segundos (15000 ms) y volvemos a ejecutar esta misma función
      setTimeout(() => {
        conectarTikTok();
      }, 15000);
    });
  }
  
  // Llamamos a la función por primera vez para arrancar el ciclo
  conectarTikTok();
}

// ==========================================
// INICIAR SERVIDOR
// ==========================================

const PORT = process.env.PORT || 3001;
//console.log(PORT);
server.listen(PORT, () => {
  console.log("Servidor backend corriendo en http://localhost:3001");
});
