import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut } from 'lucide-react';
import { config } from '../utils/config';
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
    `text-sm transition-colors py-1 ${
      isActive
        ? 'text-ink font-semibold border-b-2 border-forest'
        : 'text-ink-secondary hover:text-ink'
    }`;

  const displayName = userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario';

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-surface-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y título de producto en una sola línea */}
          <div className="flex items-center gap-3">
            <NavLink to="/" className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-forest inline-block" />
              <span className="font-serif text-xl font-bold tracking-tight text-ink">
                ProxyCache
              </span>
            </NavLink>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/" className={navLinkClass}>
              Inicio
            </NavLink>
            <NavLink to="/dominios" className={navLinkClass}>
              Dominios
            </NavLink>
            <NavLink to="/cache-login" className={navLinkClass}>
              Acceso a Caché
            </NavLink>
            {currentUser && (
              <NavLink to="/dominios/nuevo" className={navLinkClass}>
                Nuevo Dominio
              </NavLink>
            )}
            {!currentUser && (
              <>
                <NavLink to="/registro" className={navLinkClass}>
                  Crear Cuenta
                </NavLink>
                <NavLink to="/login" className={navLinkClass}>
                  Iniciar Sesión
                </NavLink>
              </>
            )}
          </nav>

          {/* Controles de Sesión y Perfil (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 pl-3 border-l border-surface-border">
                <div className="flex items-center gap-2 text-xs text-ink">
                  <User className="w-3.5 h-3.5 text-ink-muted" />
                  <span className="font-medium">{displayName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  id="navbar-logout-btn"
                  className="p-1.5 rounded hover:bg-surface-subtle text-ink-muted hover:text-roseState transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>

          {/* Botón menú móvil */}
          <div className="md:hidden flex items-center gap-2">
            {currentUser && (
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded text-ink-muted hover:text-roseState"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              id="mobile-menu-button"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Menú Móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-3 pb-5 border-t border-surface-border bg-surface space-y-3">
          {currentUser && (
            <div className="p-3 rounded bg-surface-subtle border border-surface-border text-xs flex items-center gap-2">
              <User className="w-4 h-4 text-ink-muted" />
              <div className="flex flex-col">
                <span className="font-semibold text-ink">{displayName}</span>
                <span className="text-ink-muted text-[11px] font-mono">{currentUser.email}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-2 text-sm">
            <NavLink
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 text-ink-secondary hover:text-ink"
            >
              Inicio
            </NavLink>
            <NavLink
              to="/dominios"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 text-ink-secondary hover:text-ink"
            >
              Dominios
            </NavLink>
            <NavLink
              to="/cache-login"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 text-ink-secondary hover:text-ink"
            >
              Acceso a Caché
            </NavLink>
            {currentUser ? (
              <>
                <NavLink
                  to="/dominios/nuevo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 text-ink-secondary hover:text-ink"
                >
                  Nuevo Dominio
                </NavLink>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="py-1 text-left text-roseState hover:underline cursor-pointer"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 text-ink-secondary hover:text-ink"
                >
                  Iniciar Sesión
                </NavLink>
                <NavLink
                  to="/registro"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 text-ink-secondary hover:text-ink"
                >
                  Crear Cuenta
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
