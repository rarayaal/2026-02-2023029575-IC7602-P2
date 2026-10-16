import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft, Compass } from 'lucide-react';

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="py-12 sm:py-20 flex flex-col items-center justify-center text-center animate-fadeIn">
      <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-slate-800 max-w-lg w-full space-y-6 shadow-2xl">
        
        {/* Icono de advertencia */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Títulos */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-bold px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/60">
            Error 404 · SPA Routing
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Página No Encontrada
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            La ruta solicitada <code className="text-indigo-300 font-mono bg-black/40 px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> no existe en el enrutador de la aplicación.
          </p>
        </div>

        {/* Nota informativa */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5 text-left">
          <Compass className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>
            Esta vista verifica el manejo correcto de rutas no coincidentes mediante React Router y comprueba que las reglas de reescritura en Vercel y Nginx dirigen adecuadamente las peticiones al cliente SPA.
          </span>
        </div>

        {/* Botón de retorno al inicio */}
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Página Principal</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
