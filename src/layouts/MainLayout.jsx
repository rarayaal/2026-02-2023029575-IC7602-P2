import React from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { config } from '../utils/config';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-dark text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Banner de aviso visible si falta VITE_API_BASE_URL */}
      {!config.isApiConfigured && (
        <div 
          id="missing-api-banner"
          className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-3 text-amber-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-sm"
        >
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
          <span>
            <strong>Advertencia de Configuración:</strong> La variable de entorno{' '}
            <code className="font-mono bg-amber-950/80 px-1.5 py-0.5 rounded text-amber-300 border border-amber-800/60">
              VITE_API_BASE_URL
            </code>{' '}
            no está configurada. Las peticiones al REST API estarán deshabilitadas hasta definirla en el archivo <code className="font-mono bg-amber-950/80 px-1.5 py-0.5 rounded text-amber-300 border border-amber-800/60">.env</code>.
          </span>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
