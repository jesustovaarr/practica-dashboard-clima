import { supabase } from './supabaseClient';

// Clave de acceso para OpenWeatherMap
const weatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

// Consulta datos del clima desde la API externa
async function consultarApiExterna(ciudad) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    ciudad
  )}&units=metric&lang=es&appid=${weatherApiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error en OpenWeather: ${res.statusText}`);
  }
  return await res.json();
}

// Ingesta los datos actualizados de una ciudad hacia Supabase
export async function sincronizarCiudad(nombreCiudad) {
  // Obtencion de datos desde la API publica
  const data = await consultarApiExterna(nombreCiudad);

  // Normalizacion del modelo de datos
  const registro = {
    ciudad: data.name,
    pais: data.sys?.country || 'N/A',
    temperatura: data.main.temp,
    sensacion_termica: data.main.feels_like,
    humedad: data.main.humidity,
    viento_velocidad: parseFloat((data.wind.speed * 3.6).toFixed(2)),
    descripcion: data.weather[0]?.description || 'Sin descripción',
    icono: data.weather[0]?.icon || '01d',
    actualizado_en: new Date().toISOString()
  };

  // Persistencia en Supabase
  const { data: insertData, error } = await supabase
    .from('ciudades')
    .upsert(registro, { onConflict: 'ciudad' })
    .select()
    .single();

  if (error) throw error;
  return insertData;
}
