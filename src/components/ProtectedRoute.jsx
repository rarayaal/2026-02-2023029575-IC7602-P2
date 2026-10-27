/**
 * Componente guardián de rutas protegidas (T-33 a T-38).
 * Redirige usuarios no autenticados a /login conservando la ruta de destino original.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Shield, Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
            <Shield className="w-6 h-6" />
          </div>
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <p className="text-xs text-slate-400 font-mono">Verificando sesión de autenticación...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
