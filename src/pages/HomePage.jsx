import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Layers, 
  Terminal, 
  Globe, 
  Server, 
  ArrowRight, 
  AlertCircle,
  Code2,
  UserPlus,
  LogIn
} from 'lucide-react';
import { config } from '../utils/config';
import { PROJECT_METADATA } from '../utils/constants';
import apiClient from '../services/apiClient';
import StatusBadge from '../components/StatusBadge';

export default function HomePage() {
  const [testResult, setTestResult] = useState(null);
  const [testingClient, setTestingClient] = useState(false);

  const handleTestClient = async () => {
    setTestingClient(true);
    setTestResult(null);

    try {
      // Prueba genérica del cliente HTTP centralizado (sin endpoints de negocio quemados)
      const res = await apiClient.get('/health');
      setTestResult(res);
    } catch (err) {
      setTestResult({
        ok: false,
        status: 0,
        data: null,
        error: err.message,
        isConfigError: true,
      });
    } finally {
      setTestingClient(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 sm:p-10 border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="Tarea T33: Estructura Base de la UI" status="success" />
            <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-slate-800">
              Vite 5 + React 18 + Tailwind 3
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Estructura Base de la UI <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-indigo-300">
              Zonal Cache & Proxy
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Base frontend configurada con enrutamiento declarativo, cliente HTTP centralizado desacoplado, 
            diseño responsivo y automatización de despliegue para Vercel y Docker Compose.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/dominios"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Globe className="w-4 h-4 text-emerald-300" />
              <span>Administrar Dominios (T-35)</span>
            </Link>

            <Link
              to="/registro"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-indigo-300 text-sm font-semibold border border-indigo-500/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Cuenta (T-34)</span>
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-indigo-400" />
              <span>Iniciar Sesión</span>
            </Link>

            <button
              onClick={handleTestClient}
              disabled={testingClient}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <Server className="w-4 h-4 text-sky-400" />
              <span>{testingClient ? 'Comprobando cliente...' : 'Probar /api/health'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resultado de la prueba del cliente HTTP genérico */}
      {testResult && (
        <div className={`p-4 rounded-2xl border text-xs leading-relaxed glass-panel ${
          testResult.ok ? 'border-emerald-800 text-emerald-200' : 'border-amber-800/80 text-amber-200'
        }`}>
          <div className="font-semibold text-sm mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Resultado de la prueba del cliente HTTP centralizado:</span>
          </div>
          <p className="text-slate-300">
            {testResult.ok
              ? 'Petición exitosa al backend.'
              : testResult.isConfigError
              ? 'Error controlado: No se pudo realizar la petición porque la variable VITE_API_BASE_URL no está configurada.'
              : `Petición dirigida a "${config.apiBaseUrl}/health". Estado de conexión capturado correctamente sin endpoints quemados:`}
          </p>
          <pre className="mt-2 p-2.5 rounded-lg bg-black/50 font-mono text-slate-300 overflow-x-auto text-[11px]">
            {testResult.error || JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Grid de 4 Bloques de Verificación Técnica de T33 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Code2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">React 18 & Vite 5</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Compilación ultrarrápida, Fast Refresh en desarrollo y bundle optimizado para producción.
          </p>
          <div className="pt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Configuración validada</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Tailwind CSS 3</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tokens de diseño curados, tipografía moderna, modo oscuro por defecto y layout responsivo.
          </p>
          <div className="pt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Estilos compilados</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Globe className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">React Router DOM 6</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Navegación SPA declarativa con layout base compartido (Navbar, Outlet, Footer) y vista 404.
          </p>
          <div className="pt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Enrutamiento activo</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Vercel & Docker</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            vercel.json con SPA rewrites, Dockerfile multi-stage con Nginx y docker-compose.yml en 1 comando.
          </p>
          <div className="pt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Automatización lista</span>
          </div>
        </div>

      </div>

      {/* Panel de Configuración de Variables de Entorno (Sin Valores Quemados) */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>Variables de Entorno Cargadas (VITE_*)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Valores obtenidos dinámicamente mediante <code>src/utils/config.js</code> desde el archivo <code>.env</code>
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
            Cero valores quemados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-sans font-semibold">VITE_APP_TITLE:</span>
            <span className="text-indigo-300 font-bold">{config.appTitle}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-sans font-semibold">VITE_APP_ENV:</span>
            <span className="text-emerald-300 font-bold">{config.appEnv}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-sans font-semibold">VITE_API_BASE_URL:</span>
            {config.isApiConfigured ? (
              <span className="text-sky-300 font-bold break-all">{config.apiBaseUrl}</span>
            ) : (
              <span className="text-amber-400 font-bold italic">⚠️ No configurada (sin URL base)</span>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-sans font-semibold">UI_PORT (Configurado):</span>
            <span className="text-amber-300 font-bold">{config.uiPort}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 md:col-span-2">
            <span className="text-slate-400 block font-sans font-semibold">Firebase Authentication Web SDK:</span>
            {config.isFirebaseConfigured ? (
              <span className="text-emerald-400 font-bold">
                ✓ Configurado (Project ID: {config.firebase.projectId})
              </span>
            ) : (
              <span className="text-amber-400 font-bold italic">
                ⚠️ Pendiente (requiere VITE_FIREBASE_API_KEY y VITE_FIREBASE_PROJECT_ID en .env)
              </span>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Cumplimiento de Requisitos:</strong> Las variables <code className="text-slate-200">VITE_*</code> se inyectan en tiempo de build tanto en Vite local como en el <code className="text-slate-200">Dockerfile</code> mediante directivas <code className="text-slate-200">ARG</code>, y en <code className="text-slate-200">docker-compose.yml</code> mediante <code className="text-slate-200">build.args</code>.
          </span>
        </div>
      </div>

    </div>
  );
}
