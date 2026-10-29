import React from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar';
import { config } from '../utils/config';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <Navbar />

      {/* Banner de aviso discreto si falta VITE_API_BASE_URL */}
      {!config.isApiConfigured && (
        <div 
          id="missing-api-banner"
          className="bg-amberState-subtle border-b border-amberState-border px-4 py-2 text-amberState text-xs font-medium flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-amberState" />
          <span>
            <strong>Atención:</strong> La URL del API centralizado no está configurada. Las consultas al servidor estarán deshabilitadas.
          </span>
        </div>
      )}

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
