import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Server, Home, AlertCircle, Menu, X, UserPlus, Globe, Plus, LogIn, LogOut, User, ShieldCheck } from 'lucide-react';
import { config } from '../utils/config';
import StatusBadge from './StatusBadge';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  const displayName = userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario';

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
                  <span className="text-slate-400 font-mono">T33 - T40</span>
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
            <NavLink to="/dominios" className={navLinkClass}>
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Dominios</span>
            </NavLink>
            <NavLink to="/cache-login" className={navLinkClass}>
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Caché Auth</span>
            </NavLink>
            {currentUser && (
              <NavLink to="/dominios/nuevo" className={navLinkClass}>
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Nuevo Dominio</span>
              </NavLink>
            )}
            {!currentUser && (
              <>
                <NavLink to="/registro" className={navLinkClass}>
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <span>Crear Cuenta</span>
                </NavLink>
                <NavLink to="/login" className={navLinkClass}>
                  <LogIn className="w-4 h-4 text-indigo-300" />
                  <span>Iniciar Sesión</span>
                </NavLink>
              </>
            )}
          </nav>

          {/* Controles de Sesión y Perfil (Desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-slate-200 font-semibold leading-tight">{displayName}</span>
                    <span className="text-[10px] text-slate-500 font-mono leading-tight">{currentUser.email}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  id="navbar-logout-btn"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 border border-slate-750 transition-all cursor-pointer"
                >
                  Acceder
                </Link>
                <Link
                  to="/registro"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Botón menú móvil */}
          <div className="md:hidden flex items-center gap-2">
            {currentUser && (
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
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
          {currentUser && (
            <div className="p-3 mb-2 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-white">{displayName}</span>
                <span className="text-[10px] text-slate-400 font-mono">{currentUser.email}</span>
              </div>
            </div>
          )}

          <NavLink
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/60"
          >
            <Home className="w-4 h-4 text-sky-400" />
            <span>Inicio</span>
          </NavLink>

          <NavLink
            to="/dominios"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/60"
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Administración de Dominios</span>
          </NavLink>

          {currentUser ? (
            <>
              <NavLink
                to="/dominios/nuevo"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/60"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Nuevo Dominio</span>
              </NavLink>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/60"
              >
                <LogIn className="w-4 h-4 text-indigo-400" />
                <span>Iniciar Sesión</span>
              </NavLink>
              <NavLink
                to="/registro"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/60"
              >
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Crear Cuenta</span>
              </NavLink>
            </>
          )}

          <NavLink
            to="/cache-login"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/60"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Caché Auth (T-39)</span>
          </NavLink>

          <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Entorno: <strong className="text-indigo-300 font-mono">{config.appEnv}</strong></span>
            <span className="text-slate-500 font-mono">T-33 a T-40</span>
          </div>
        </div>
      )}
    </header>
  );
}
