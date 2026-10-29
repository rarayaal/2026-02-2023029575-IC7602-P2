import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="py-12 sm:py-20 flex flex-col items-center justify-center text-center animate-fadeIn">
      <div className="bg-surface p-8 sm:p-10 rounded-lg border border-surface-border max-w-md w-full space-y-5 shadow-card">
        
        {/* Icono de advertencia */}
        <div className="w-12 h-12 rounded bg-amberState-subtle border border-amberState-border flex items-center justify-center mx-auto text-amberState">
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Títulos */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-forest font-semibold px-2 py-0.5 rounded bg-forest-subtle border border-forest/20">
            Error 404
          </span>
          <h1 className="font-serif text-2xl font-bold text-ink tracking-tight">
            Página No Encontrada
          </h1>
          <p className="text-xs text-ink-secondary leading-relaxed">
            La ruta solicitada <code className="text-forest font-mono bg-surface-subtle px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> no existe en el enrutador de la aplicación.
          </p>
        </div>

        {/* Mensaje sobrio */}
        <p className="text-xs text-ink-muted">
          Verifique la dirección introducida o vuelva a la página de inicio para continuar navegando.
        </p>

        {/* Botón de retorno al inicio */}
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-forest hover:bg-forest-hover text-white text-xs sm:text-sm font-medium shadow-subtle transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
