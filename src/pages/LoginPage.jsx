/**
 * Pantalla de inicio de sesión de la plataforma (T-33 a T-38).
 * Autentica usuarios mediante Firebase Authentication (signInWithEmailAndPassword).
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, ArrowRight, Shield, CheckCircle2, Server } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail, validatePassword } from '../services/authService';
import CacheLoginPage from './CacheLoginPage';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const isCacheModeFromQuery = Boolean(searchParams.get('domain') || searchParams.get('cache'));
  const [activeTab, setActiveTab] = useState(isCacheModeFromQuery ? 'cache' : 'admin');

  const { login, currentUser, logout, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Ruta de redirección post-login (o /dominios por defecto)
  const fromPath = location.state?.from?.pathname || '/dominios';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (loginError) {
      setLoginError(null);
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.email || !formData.email.trim()) {
      errors.email = 'El correo electrónico es obligatorio';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Formato de correo no válido (ej. usuario@ejemplo.com)';
    }

    const pwdVal = validatePassword(formData.password);
    if (!pwdVal.valid) {
      errors.password = pwdVal.message;
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);

    const validation = validate();
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    const result = await login(formData.email, formData.password);
    setIsSubmitting(false);

    if (result.ok) {
      navigate(fromPath, { replace: true });
    } else {
      setLoginError(result.error);
    }
  };

  // Si ya tiene una sesión iniciada
  if (currentUser) {
    return (
      <div className="max-w-md mx-auto space-y-6 animate-fadeIn py-8">
        <div className="p-8 rounded-3xl glass-panel border border-emerald-500/30 bg-emerald-950/10 space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Sesión Activa</h2>
            <p className="text-xs text-slate-300 mt-1">
              Ha iniciado sesión como <span className="font-mono text-indigo-300">{currentUser.email}</span>
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Link
              to={fromPath}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continuar al Panel de Dominios</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => logout()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-all cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn py-6">
      
      {/* Selector de Modo de Autenticación */}
      <div className="flex rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          id="tab-admin-auth"
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'admin'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>Administrador de Plataforma</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cache')}
          id="tab-cache-auth"
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'cache'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Acceso a Caché Zonal (T-39)</span>
        </button>
      </div>

      {activeTab === 'cache' ? (
        <CacheLoginPage />
      ) : (
        <div className="max-w-md mx-auto space-y-6">
          {/* Encabezado y Metadatos */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <StatusBadge label="Autenticación Firebase" status="info" />
            <Link
              to="/registro"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>Crear cuenta</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Tarjeta de Inicio de Sesión */}
          <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-slate-800 space-y-6">
            
            <div className="space-y-2 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto sm:mx-0">
                <LogIn className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Iniciar Sesión</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingrese sus credenciales de Firebase Authentication para acceder a la administración de dominios y URLs.
              </p>
            </div>

        {/* Advertencia si Firebase no está configurado */}
        {!isConfigured && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Configuración de Firebase Requerida</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              Defina las variables <code className="text-amber-100 font-mono">VITE_FIREBASE_API_KEY</code> y{' '}
              <code className="text-amber-100 font-mono">VITE_FIREBASE_PROJECT_ID</code> en el archivo{' '}
              <code className="text-amber-100 font-mono">.env</code> para habilitar la autenticación en el cliente.
            </p>
          </div>
        )}

        {/* Banner de error */}
        {loginError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">Error de autenticación</div>
              <p className="text-rose-200/90 text-xs leading-relaxed">{loginError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          
          {/* Campo: Correo Electrónico */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                id="login-email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="usuario@ejemplo.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-sm placeholder-slate-500 focus:outline-none transition-all ${
                  fieldErrors.email
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{fieldErrors.email}</span>
              </p>
            )}
          </div>

          {/* Campo: Contraseña */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                id="login-password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-sm placeholder-slate-500 focus:outline-none transition-all ${
                  fieldErrors.password
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          {/* Botón de Enviar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              id="login-submit-button"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </div>

        </form>

        <div className="pt-3 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            ¿No tiene una cuenta registrada?{' '}
            <Link to="/registro" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Registrar cuenta nueva
            </Link>
          </p>
        </div>

      </div>

      {/* Nota de seguridad */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-2.5">
        <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>Las credenciales se validan directamente con Firebase Authentication sin almacenar contraseñas localmente.</span>
      </div>

        </div>
      )}

    </div>
  );
}
