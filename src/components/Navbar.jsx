import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Server, Home, AlertCircle, Menu, X, UserPlus, Globe, Plus } from 'lucide-react';
import { config } from '../utils/config';
import StatusBadge from './StatusBadge';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y título de la aplicación */}
          <div className="flex items-center gap-3">
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-surface-dark rounded-[10px] flex items-center justify-center">
                  <Server className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                    {config.appTitle}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                    IC-7602
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>UI & Orquestación</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 font-mono">T33 / T34</span>
                </div>
              </div>
            </NavLink>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-1.5">
            <NavLink to="/" className={navLinkClass}>
              <Home className="w-4 h-4 text-sky-400" />
              <span>Inicio</span>
            </NavLink>
            <NavLink to="/registro" className={navLinkClass}>
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>Crear Cuenta</span>
            </NavLink>
            <NavLink to="/dominios" className={navLinkClass}>
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Dominios</span>
            </NavLink>
            <NavLink to="/ruta-inexistente" className={navLinkClass}>
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Ruta 404</span>
            </NavLink>
          </nav>

          {/* Indicadores de Entorno y Tarea (Desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            <StatusBadge 
              label={`Entorno: ${config.appEnv}`} 
              status={config.appEnv === 'production' ? 'success' : 'info'} 
              pulse={config.appEnv !== 'production'}
            />
            <span className="text-xs text-slate-400 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
              Resp: Alexandra De Gracia
            </span>
          </div>

          {/* Botón menú móvil */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              id="mobile-menu-button"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Menú Móvil desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 border-t border-slate-800 bg-surface-dark/95 backdrop-blur-xl space-y-2">
          <NavLink
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/60"
          >
            <Home className="w-4 h-4 text-sky-400" />
            <span>Inicio</span>
          </NavLink>
          <NavLink
            to="/registro"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/60"
          >
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <span>Crear Cuenta (T-34)</span>
          </NavLink>
          <NavLink
            to="/dominios"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/60"
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Administración de Dominios (T-35)</span>
          </NavLink>
          <NavLink
            to="/dominios/nuevo"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/60"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Nuevo Dominio (T-34)</span>
          </NavLink>
          <NavLink
            to="/ruta-inexistente"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/60"
          >
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Verificar Ruta 404 (SPA)</span>
          </NavLink>

          <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Entorno: <strong className="text-indigo-300 font-mono">{config.appEnv}</strong></span>
            <span className="text-slate-500">T33 / T34 / T35 / T36</span>
          </div>
        </div>
      )}
    </header>
  );
}


