const express = require("express");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

// Configuración del servidor y WebSockets
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ==========================================
// VARIABLES DE ENTORNO
// ==========================================

const tiktokUsername = process.env.USERNAME_TIKTOK;
const esSimulador = process.env.SIMULADOR === "true";

// ==========================================
// SISTEMA DE PROBABILIDADES
// ==========================================

// Función dinamica para sortear
function sortearRangoDinamico(esRegalo = false, monedasGastadas = 0) {
  let tabla = [
    { nombre: "Plata", probabilidad: 30 },
    { nombre: "Oro", probabilidad: 25 },
    { nombre: "Platino", probabilidad: 20 },
    { nombre: "Diamante", probabilidad: 10 },
    { nombre: "Élite", probabilidad: 8.9 },
    { nombre: "As", probabilidad: 6 },
    { nombre: "Unreal", probabilidad: 0.1 },
  ];
  // let tabla = [
  //   { nombre: "Plata", probabilidad: 0 },
  //   { nombre: "Oro", probabilidad: 0 },
  //   { nombre: "Platino", probabilidad: 0 },
  //   { nombre: "Diamante", probabilidad: 0 },
  //   { nombre: "Élite", probabilidad: 0 },
  //   { nombre: "As", probabilidad: 0 },
  //   { nombre: "Unreal", probabilidad: 100 },
  // ];

  if (esRegalo && monedasGastadas > 0) {
    // Calculamos el Bonus. Cada moneda da un +0.5% al Unreal.
    let bonusUnreal = monedasGastadas * 0.1;

    // Restamos probabilidad a Plata y Oro, y subimos unreal
    tabla[0].probabilidad -= bonusUnreal;
    if (tabla[0].probabilidad < 0) {
      tabla[1].probabilidad += tabla[0].probabilidad;
      tabla[0].probabilidad = 0;
    }
    tabla[6].probabilidad += bonusUnreal; // Inyectamos todo el bonus directo al Unreal

    // Tope
    if (tabla[6].probabilidad > 100) {
      tabla[6].probabilidad = 100;
    }
  }

  const random = Math.random() * 100;
  let acumulado = 0;
  for (const rango of tabla) {
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
let ruletaOcupada = false; // Semáforo para saber si el frontend está ocupado.
const usuariosQueYaSiguieron = new Set(); // Memoria para guardar quién ya nos siguió en este directo

if (esSimulador) {
  // ==========================================
  // MODO SIMULADOR
  // ==========================================
  console.log("🛠️ INICIANDO EN MODO SIMULADOR 🛠️");
  console.log("Esperando 5 segundos para que el frontend se conecte...");

  function simuladorAcciones(){

    cantidad = 0;
    follow = false;
    accionSimulador = "Follow";
    random = Math.floor(Math.random() * 1000);
    if (random % 2 === 0){
      cantidad = 100;
      follow = true;
      accionSimulador = "Rosa";
    }

    const rangoGanador = sortearRangoDinamico(follow, cantidad);

    // Lo empujamos al final de la fila (array)
    colaFollows.push({
      usuario: "TestUser_" + random,
      rango: rangoGanador,
      accion: follow ?`${cantidad}x ${accionSimulador}`: accionSimulador,
    });

    procesarCola();
  }

  // Esperamos 5 segundos antes de arrancar
  setTimeout(() => {
    console.log("¡Disparando ráfaga!");

    // Ejecuta cada 5 segundos
    setInterval(simuladorAcciones, 5000);

  }, 5000);
} else {
  // ==========================================
  // MODO TIKTOK LIVE
  // ==========================================
  console.log("📡 INICIANDO EN MODO TIKTOK LIVE 📡");

  // Crear la conexión a TikTok
  const tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

  
  // Conexion con tiktok
  function conectarTikTok() {
    console.log(`Intentando conectar con la cuenta: @${tiktokUsername}...`);

    tiktokLiveConnection
      .connect()
      .then((state) => {
        console.info(`✅ Conectado al directo. ID de sala: ${state.roomId}`);
      })
      .catch((err) => {
        console.error("❌ Error al conectar. Reintentando en 60 segundos...");
        console.error(err);

        // Si falla, esperamos 60
        setTimeout(() => {
          conectarTikTok();
        }, 60000);
      });
  }

  // FOLLOWS
  tiktokLiveConnection.on("follow", (data) => {

    if (usuariosQueYaSiguieron.has(data.uniqueId)){
      console.log(`♻️ Refollow ignorado: ${data.uniqueId} ya había girado la ruleta.`);
      return; // Cortamos la ejecución acá, no hace nada más
    }

    // 2. Si es un follow nuevo, lo anotamos en la memoria para que no pueda repetir
    usuariosQueYaSiguieron.add(data.uniqueId);

    console.log(`¡${data.uniqueId} te ha seguido! Entrando a la fila...`);

    const rangoGanador = sortearRangoDinamico(false, 0);

    // Lo empujamos al final de la fila (array)
    colaFollows.push({
      usuario: data.uniqueId,
      rango: rangoGanador,
      accion: "Follow",
    });

    procesarCola();
  });

  // REGALOS
  tiktokLiveConnection.on("gift", (data) => {
    // Esperamos a que termine el combo para calcular el total
    if (data.giftType === 1 && !data.repeatEnd) {
      return;
    }

    const monedasTotales = data.diamondCount * data.repeatCount; // Costo x Cantidad enviada

    console.log(
      `🎁 ${data.uniqueId} mandó ${data.repeatCount}x ${data.giftName} (Total: ${monedasTotales} monedas)`,
    );

    //Envio el total de monedad invertidas
    const rangoGanador = sortearRangoDinamico(true, monedasTotales);

    // Lo mandamos a la fila
    colaFollows.push({
      usuario: data.uniqueId,
      rango: rangoGanador,
      // Mandamos el nombre del regalo al frontend para mostrarlo en pantalla
      accion: `${data.repeatCount}x ${data.giftName}`,
    });

    procesarCola();
  });

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
