import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Importación dinámica de imágenes (Vite)
const cargarImagen = (name) => new URL(`./assets/rangos/${name}.webp`, import.meta.url).href;

// Configuración detallada de los Rangos
const CONFIG_RANGOS = {
  'Plata':   { img: cargarImagen('Plata'),   color: '#b0c4de' },
  'Oro':     { img: cargarImagen('Oro'),     color: '#ffd700' },
  'Platino': { img: cargarImagen('Platino'), color: '#00ced1' },
  'Diamante':{ img: cargarImagen('Diamante'),color: '#1e90ff' },
  'Élite':   { img: cargarImagen('Elite'),   color: '#8a2be2' },
  'As':      { img: cargarImagen('As'),      color: '#ff4500' },
  'Unreal':  { img: cargarImagen('Unreal'),  color: '#ff1493' },
}

const NOMBRES_RANGOS = Object.keys(CONFIG_RANGOS);

// Conexion backend
//const socket = io('http://localhost:3001');
const socket = io('https://ruleta-fortnite-backend.onrender.com');


function App() {
  const [visible, setVisible] = useState(false); // Controla si todo se ve o no
  const [girando, setGirando] = useState(false);
  const [ganador, setGanador] = useState(null);
  const [usuario, setUsuario] = useState('');
  const [itemsRuleta, setItemsRuleta] = useState([]);
  
  const ruletaRef = useRef(null);

  useEffect(() => {
    const itemsRelleno = Array.from({ length: 100 }, () => 
      NOMBRES_RANGOS[Math.floor(Math.random() * NOMBRES_RANGOS.length)]
    );
    setItemsRuleta(itemsRelleno);
  }, []);

  useEffect(() => {
    socket.on('girarRuleta', (data) => {
      // Si ya hay una ruleta en pantalla, ignoramos para que no se rompa la animación
      if (visible) return; 
      
      // 1. Mostrar la ruleta en pantalla y preparar el estado
      setVisible(true);
      setGirando(true);
      setGanador(null);
      setUsuario(data.usuario);

      const posicionGanadora = 85;
      const nuevosItems = Array.from({ length: 100 }, () => 
        NOMBRES_RANGOS[Math.floor(Math.random() * NOMBRES_RANGOS.length)]
      );
      nuevosItems[posicionGanadora] = data.rango;
      setItemsRuleta(nuevosItems);

      // Nos aseguramos de que arranque desde la posición 0
      if (ruletaRef.current) {
        ruletaRef.current.style.transition = 'none';
        ruletaRef.current.style.transform = 'translateX(0px)';
      }

      // 2. Esperamos un instante a que aparezca y lanzamos el giro
      setTimeout(() => {
        const anchoCaja = 150;
        const gap = 10;
        const paddingInicial = 10;
        
        const centroDelItem = paddingInicial + (posicionGanadora * (anchoCaja + gap)) + (anchoCaja / 2);
        const offsetAleatorio = Math.floor(Math.random() * 80) - 40; 
        const centroPantalla = window.innerWidth / 2;
        const distancia = centroDelItem - centroPantalla + offsetAleatorio;

        if (ruletaRef.current) {
          ruletaRef.current.style.transition = 'transform 7s cubic-bezier(0.15, 0.9, 0.2, 1)';
          ruletaRef.current.style.transform = `translateX(-${distancia}px)`;
        }
      }, 100);

      // 3. Frena la ruleta y muestra el ganador (Se queda congelada)
      setTimeout(() => {
        setGanador(data.rango);
        setGirando(false);
        
        // 4. Esperamos 5 segundos para que la gente vea el resultado y luego ocultamos todo
        setTimeout(() => {
          setVisible(false);
          
          // 5. Una vez que ya está invisible (medio segundo de fade), limpiamos por detrás
          setTimeout(() => {
            setGanador(null);
            if (ruletaRef.current) {
               // Reseteamos silenciosamente a 0 para el próximo follow
               ruletaRef.current.style.transition = 'none';
               ruletaRef.current.style.transform = 'translateX(0px)';
            }
          }, 500); 

        }, 5000); // <-- Tiempo que el cartel queda en pantalla (5 seg)

      }, 7100); // <-- Tiempo que dura el giro
    });

    return () => socket.off('girarRuleta');
  }, [visible]); // Agregamos 'visible' a las dependencias

return (
    // Contenedor principal que SIEMPRE está visible
    <div className="contenedor-general">
      
      {/* Se muestra solo cuando 'visible' es false */}
      <div className={`banner-espera ${!visible ? 'activo' : ''}`}>
        {/* <h1>🎯 FOLLOW = RULETA 🎯</h1> */}
        <h1>FOLLOW = RULETA</h1>
        <p>SI SALE <span className="texto-unreal-banner">UNREAL</span> TE REGALO UN CLUB DE FORTNITE</p>
      </div>

      {/* --- ZONA DE LA RULETA --- */}
      {/* Se muestra solo cuando 'visible' es true */}
      <div className={`zona-ruleta ${visible ? 'activo' : ''}`}>
        <div className={`overlay-stream ${girando ? 'activo' : ''}`}></div>

        <div className={`contenedor-ruleta ${girando ? 'brillo-borde' : ''}`}>
          <div className="marcador-centro"></div>
          
          <div className="fila-ruleta" ref={ruletaRef}>
            {itemsRuleta.map((nombreRango, index) => {
              const info = CONFIG_RANGOS[nombreRango];
              return (
                <div key={index} className="caja-rango" style={{'--rango-color': info.color}}>
                  <div className="resplandor-interior"></div>
                  <img src={info.img} alt={nombreRango} className="img-rango" />
                  <span className="nombre-rango">{nombreRango}</span>
                </div>
              );
            })}
          </div>
        </div>

        {ganador && (
          <div className={`cartel-ganador ${ganador.toLowerCase() === 'unreal' ? 'ganador-unreal' : ''}`}>
            <p className="texto-seguidor">¡Gracias por el follow, <span>{usuario}</span>!</p>
            <div className="info-premio">
              <img src={CONFIG_RANGOS[ganador].img} alt={ganador} className="img-ganador-cartel" />
              <h1 className="nombre-ganador-cartel" style={{color: CONFIG_RANGOS[ganador].color}}>{ganador}</h1>
            </div>
            {ganador === 'Unreal' && (
              <div className="alerta-unreal">
                🔥 🏆 RECLAMÁ EL PREMIO AL PRIVADO 🏆 🔥
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default App;