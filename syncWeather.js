import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Carga de variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const weatherApiKey = process.env.OPENWEATHER_API_KEY;

if (!supabaseUrl || !supabaseKey || !weatherApiKey) {
  console.error('Faltan variables de entorno requeridas en el archivo .env');
  process.exit(1);
}

// Inicializacion del cliente de Supabase apuntando al esquema de clima
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'clima' }
});

// Catalogo de ciudades
const CIUDADES_INICIALES = [
  'Celaya',
  'Querétaro',
  'León',
  'Ciudad de México',
  'Guadalajara',
  'Monterrey',
  'Cancún',
  'Puebla',
  'Madrid',
  'Barcelona',
  'París',
  'Roma',
  'Berlín',
  'Londres',
  'Tokyo',
  'Seúl',
  'Sydney',
  'Nueva York',
  'Los Ángeles',
  'Toronto',
  'Buenos Aires',
  'Bogotá',
  'São Paulo'
];

// Consulta la API de OpenWeatherMap para una ciudad especifica
async function obtenerClima(ciudad) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    ciudad
  )}&units=metric&lang=es&appid=${weatherApiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error en OpenWeather para "${ciudad}": ${res.statusText}`);
  }
  return await res.json();
}

// Sincronizacion de datos desde OpenWeatherMap hacia Supabase
async function sincronizar() {
  console.log('Iniciando proceso de ingesta...');

  for (const ciudad of CIUDADES_INICIALES) {
    try {
      // Obtencion de datos desde la API publica
      const data = await obtenerClima(ciudad);

      // Normalizacion y mapeo del modelo de datos
      const registro = {
        ciudad: data.name,
        pais: data.sys?.country || 'N/A',
        temperatura: data.main.temp,
        sensacion_termica: data.main.feels_like,
        humedad: data.main.humidity,
        viento_velocidad: parseFloat((data.wind.speed * 3.6).toFixed(2)), // Conversion de m/s a km/h
        descripcion: data.weather[0]?.description || 'Sin descripcion',
        icono: data.weather[0]?.icon || '01d',
        actualizado_en: new Date().toISOString()
      };

      // Persistencia en Supabase
      const { error } = await supabase
        .from('ciudades')
        .upsert(registro, { onConflict: 'ciudad' });

      if (error) {
        console.error(`Fallo al persistir ${ciudad}:`, error.message);
      } else {
        console.log(`Exito: ${registro.ciudad}, ${registro.pais} | Temp: ${registro.temperatura} C | ${registro.descripcion}`);
      }
    } catch (err) {
      console.error(`Error procesando ${ciudad}:`, err.message);
    }
  }

  console.log('Proceso de ingesta finalizado.');
}

sincronizar();