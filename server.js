const express = require('express');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

// Configuración del servidor y WebSockets
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Permite que el frontend en React se conecte sin problemas
});

// Tu nombre de usuario de TikTok
const tiktokUsername = process.env.USERNAME_TIKTOK;
console.log(tiktokUsername)

// Crear la conexión a TikTok
const tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

// Sistema de probabilidades (Los rangos de Fortnite)
const rangos = [
    { nombre: 'Plata', probabilidad: 40 },
    { nombre: 'Oro', probabilidad: 30 },
    { nombre: 'Platino', probabilidad: 15 },
    { nombre: 'Diamante', probabilidad: 10 },
    { nombre: 'Élite', probabilidad: 3.99 },
    { nombre: 'As', probabilidad: 1 },
    { nombre: 'Unreal', probabilidad: 0.01 } // 0.01 Probabilidad
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
    return 'Plata'; // Por defecto
}

// Escuchar cuando alguien da Follow
tiktokLiveConnection.on('follow', (data) => {
    console.log(`¡${data.uniqueId} te ha seguido!`);
    
    // Sorteamos el rango
    const rangoGanador = sortearRango();
    console.log(`Resultado de la ruleta: ${rangoGanador}`);

    // Le avisamos al frontend por WebSocket para que empiece a girar la ruleta
    io.emit('girarRuleta', { 
        usuario: data.uniqueId, 
        rango: rangoGanador 
    });
});

// Conectar a TikTok
tiktokLiveConnection.connect().then(state => {
    console.info(`Conectado al directo. ID de sala: ${state.roomId}`);
}).catch(err => {
    console.error('Error al conectar a TikTok. ¿Estás seguro de que estás en vivo?:', err);
});

// ==========================================
// MODO PRUEBA: Simulador automático
// ==========================================
// Esto disparará una ruleta falsa cada 15 segundos para que puedas diseñar tranquilo.
// Cuando vayas a hacer directo en TikTok, simplemente borrá o comentá estas líneas.
// setInterval(() => {
//     console.log("Testeando: Simulando un follow automático...");
//     const rangoGanador = sortearRango();
    
//     io.emit('girarRuleta', { 
//         usuario: 'TestUser_' + Math.floor(Math.random() * 1000), 
//         rango: rangoGanador 
//     });
// }, 15000); 
// // ==========================================

// Iniciar el servidor local
const PORT = process.env.PORT || 3001;
//console.log(PORT);
server.listen(PORT, () => {
    console.log('Servidor backend corriendo en http://localhost:3001');
});