import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { sincronizarCiudad } from './weatherService';
import { 
  Search, 
  Wind, 
  Droplets,
  LogOut, 
  RefreshCw,
  MapPin,
  AlertCircle,
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudSunRain,
  CloudMoonRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Compass
} from 'lucide-react';
import './index.css';

// Componente para renderizar iconos de clima
function WeatherIcon({ iconCode, size = 32, className = '' }) {
  const code = iconCode || '01d';
  const isNight = code.endsWith('n');

  switch (code.slice(0, 2)) {
    case '01':
      return isNight ? <Moon size={size} className={`weather-icon moon ${className}`} /> : <Sun size={size} className={`weather-icon sun ${className}`} />;
    case '02':
      return isNight ? <CloudMoon size={size} className={`weather-icon cloud-moon ${className}`} /> : <CloudSun size={size} className={`weather-icon cloud-sun ${className}`} />;
    case '03':
    case '04':
      return <Cloud size={size} className={`weather-icon cloud ${className}`} />;
    case '09':
    case '10':
      return isNight ? <CloudMoonRain size={size} className={`weather-icon rain ${className}`} /> : <CloudSunRain size={size} className={`weather-icon rain ${className}`} />;
    case '11':
      return <CloudLightning size={size} className={`weather-icon storm ${className}`} />;
    case '13':
      return <CloudSnow size={size} className={`weather-icon snow ${className}`} />;
    case '50':
      return <CloudFog size={size} className={`weather-icon mist ${className}`} />;
    default:
      return <Sun size={size} className={`weather-icon sun ${className}`} />;
  }
}

// Icono de GitHub
function GithubIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [ciudades, setCiudades] = useState([]);
  const [ciudadSeleccionada, setCiudadSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState(null);

  // Escucha del estado de sesion
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Consulta de datos de clima desde Supabase
  const cargarCiudades = async () => {
    try {
      setCargando(true);
      setError(null);

      const { data, error: supaError } = await supabase
        .from('ciudades')
        .select('*')
        .order('ciudad', { ascending: true });

      if (supaError) throw supaError;

      setCiudades(data || []);
      if (data && data.length > 0 && !ciudadSeleccionada) {
        const celaya = data.find(c => c.ciudad.toLowerCase() === 'celaya');
        setCiudadSeleccionada(celaya || data[0]);
      }
    } catch (err) {
      console.error('Error al consultar Supabase:', err.message);
      setError('No se pudo conectar con la base de datos de Supabase.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (session) {
      cargarCiudades();
    }
  }, [session]);

  // Actualiza la ciudad activa: ingesta desde API publica -> Supabase -> actualiza estado local
  const handleActualizarCiudad = async () => {
    if (!ciudadSeleccionada) return;
    try {
      setSincronizando(true);
      setError(null);

      // Ingesta hacia Supabase y retorno del nuevo registro
      const registroActualizado = await sincronizarCiudad(ciudadSeleccionada.ciudad);

      // Actualizar estado local
      setCiudadSeleccionada(registroActualizado);
      setCiudades(prev =>
        prev.map(c => (c.id === registroActualizado.id ? registroActualizado : c))
      );
    } catch (err) {
      console.error('Error al actualizar ciudad:', err.message);
      setError('No se pudo actualizar la información meteorológica.');
    } finally {
      setSincronizando(false);
    }
  };

  // Formato legible de hora
  const formatearHoraLocal = (timestamp) => {
    if (!timestamp) return 'Reciente';
    const fecha = new Date(timestamp);
    return fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Login con GitHub OAuth
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) console.error('Error en login:', error.message);
  };

  // Cierre de sesion
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCiudades([]);
    setCiudadSeleccionada(null);
  };

  // Filtrado de ciudades
  const ciudadesFiltradas = ciudades.filter(c =>
    c.ciudad.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.pais.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Pantalla de autenticacion
  if (!session) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon-wrapper">
            <Sun size={48} className="auth-sun-icon" />
          </div>
          <h1>Dashboard Meteorológico</h1>
          <p>Monitoreo del clima en tiempo real.</p>
          <button onClick={handleLogin} className="btn-github">
            <GithubIcon size={20} />
            <span>Iniciar Sesión con GitHub</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Barra superior de navegacion */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">
            <Sun size={24} />
          </div>
          <span className="brand-title">Dashboard Meteorológico</span>
        </div>

        <div className="user-profile">
          <img 
            src={session.user.user_metadata?.avatar_url || 'https://via.placeholder.com/40'} 
            alt="Avatar" 
            className="avatar"
          />
          <div className="user-meta">
            <span className="username">
              {session.user.user_metadata?.user_name || session.user.user_metadata?.full_name || 'Usuario'}
            </span>
            <span className="user-badge">Conectado</span>
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Cuerpo principal sin scroll */}
      <main className="dashboard-content">
        {/* Barra superior: buscador y boton actualizar */}
        <div className="control-bar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar ciudad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <button onClick={cargarCiudades} className="btn-refresh" title="Recargar registros">
            <RefreshCw size={17} />
            <span>Actualizar</span>
          </button>
        </div>

        {error && (
          <div className="alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {cargando ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Cargando registros desde Supabase...</p>
          </div>
        ) : (
          <div className="dashboard-columns">
            {/* Columna Izquierda: Tarjeta fija de la ciudad seleccionada */}
            <aside className="hero-column">
              {ciudadSeleccionada ? (
                <div className="featured-card">
                  <div className="featured-top">
                    <div>
                      <div className="location-pill">
                        <MapPin size={16} />
                        <span>{ciudadSeleccionada.ciudad}, {ciudadSeleccionada.pais}</span>
                      </div>
                      <span className="condition-label">{ciudadSeleccionada.descripcion}</span>
                    </div>
                    <div className="hero-icon-box">
                      <WeatherIcon iconCode={ciudadSeleccionada.icono} size={52} />
                    </div>
                  </div>

                  <div className="temp-hero">
                    <span className="temp-hero-value">{Math.round(ciudadSeleccionada.temperatura)}°</span>
                    <div className="temp-hero-meta">
                      <span className="temp-unit">Celsius</span>
                      <span className="feels-like">Sensación: {Math.round(ciudadSeleccionada.sensacion_termica)}°C</span>
                    </div>
                  </div>

                  <div className="metrics-list">
                    <div className="metric-box">
                      <div className="metric-icon-wrap blue">
                        <Droplets size={20} />
                      </div>
                      <div className="metric-texts">
                        <span className="metric-name">Humedad Relativa</span>
                        <span className="metric-val">{ciudadSeleccionada.humedad}%</span>
                      </div>
                    </div>

                    <div className="metric-box">
                      <div className="metric-icon-wrap teal">
                        <Wind size={20} />
                      </div>
                      <div className="metric-texts">
                        <span className="metric-name">Velocidad del Viento</span>
                        <span className="metric-val">{ciudadSeleccionada.viento_velocidad} km/h</span>
                      </div>
                    </div>

                    <div className="metric-box">
                      <div className="metric-icon-wrap amber">
                        <Compass size={20} />
                      </div>
                      <div className="metric-texts">
                        <span className="metric-name">Última Actualización</span>
                        <span className="metric-val">
                          {formatearHoraLocal(ciudadSeleccionada.actualizado_en)}
                        </span>
                      </div>
                      <button 
                        onClick={handleActualizarCiudad}
                        disabled={sincronizando}
                        className="btn-update-city"
                        title="Consultar API externa y actualizar en Supabase"
                      >
                        <RefreshCw size={14} className={sincronizando ? 'spin' : ''} />
                        <span>{sincronizando ? 'Actualizando...' : 'Actualizar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </aside>

            {/* Columna Derecha: Tarjeta con scroll interno para Ciudades Disponibles */}
            <section className="catalog-column">
              <div className="catalog-header">
                <h3>Ciudades Disponibles</h3>
                <span className="badge-count">{ciudadesFiltradas.length} ubicaciones</span>
              </div>

              <div className="catalog-scroll-area">
                {ciudadesFiltradas.length === 0 ? (
                  <div className="empty-state">
                    <p>No se encontraron ciudades que coincidan con la búsqueda.</p>
                  </div>
                ) : (
                  <div className="cards-grid">
                    {ciudadesFiltradas.map((c) => (
                      <article
                        key={c.id}
                        onClick={() => setCiudadSeleccionada(c)}
                        className={`city-card ${ciudadSeleccionada?.id === c.id ? 'active' : ''}`}
                      >
                        <div className="card-top">
                          <div className="card-header-info">
                            <h4>{c.ciudad}</h4>
                            <span className="card-country">{c.pais}</span>
                          </div>
                          <div className="card-icon-wrap">
                            <WeatherIcon iconCode={c.icono} size={28} />
                          </div>
                        </div>

                        <div className="card-bottom">
                          <span className="card-temp">{Math.round(c.temperatura)}°C</span>
                          <span className="card-desc">{c.descripcion}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}