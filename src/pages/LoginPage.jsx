import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, ArrowRight, CheckCircle2, Server } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail, validatePassword } from '../services/authService';
import CacheLoginPage from './CacheLoginPage';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const isCacheModeFromQuery = Boolean(searchParams.get('domain') || searchParams.get('cache'));
  const [activeTab, setActiveTab] = useState(isCacheModeFromQuery ? 'cache' : 'admin');

  const { login, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState(null);

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
        <div className="p-8 rounded-lg bg-surface border border-surface-border shadow-card space-y-6 text-center">
          <div className="w-12 h-12 rounded bg-forest-subtle text-forest border border-forest/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">Sesión Activa</h2>
            <p className="text-xs text-ink-muted mt-1">
              Ha iniciado sesión como <span className="font-mono text-ink font-medium">{currentUser.email}</span>
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Link
              to={fromPath}
              className="w-full py-2.5 px-4 rounded bg-forest hover:bg-forest-hover text-white font-medium text-xs sm:text-sm shadow-subtle transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continuar al panel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => logout()}
              className="w-full py-2 px-4 rounded bg-surface hover:bg-surface-subtle text-ink-secondary hover:text-ink border border-surface-border font-medium text-xs transition-colors cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn py-6">
      
      {/* Selector de Modo de Autenticación */}
      <div className="flex rounded bg-surface-subtle p-1 border border-surface-border text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          id="tab-admin-auth"
          className={`flex-1 py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'admin'
              ? 'bg-forest text-white shadow-subtle'
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Administración</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cache')}
          id="tab-cache-auth"
          className={`flex-1 py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'cache'
              ? 'bg-forest text-white shadow-subtle'
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Acceso a Caché</span>
        </button>
      </div>

      {activeTab === 'cache' ? (
        <CacheLoginPage />
      ) : (
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Tarjeta de Inicio de Sesión */}
          <div className="p-6 sm:p-8 rounded-lg bg-surface border border-surface-border shadow-card space-y-6">
            
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="font-serif text-2xl font-bold text-ink">Iniciar Sesión</h1>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Ingrese sus credenciales para administrar dominios y reglas de enrutamiento.
              </p>
            </div>

            {/* Banner de error */}
            {loginError && (
              <div className="p-3.5 rounded bg-roseState-subtle border border-roseState-border text-roseState text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium block">Error al iniciar sesión:</span>
                  <span>{loginError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              
              {/* Correo Electrónico */}
              <div className="space-y-1">
                <label 
                  htmlFor="login-email" 
                  className="block text-xs font-medium text-ink"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
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
                    className={`w-full pl-9 pr-3 py-2 rounded bg-white border text-ink text-sm placeholder-ink-muted focus:outline-none transition-colors ${
                      fieldErrors.email 
                        ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState' 
                        : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-roseState flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Contraseña */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label 
                    htmlFor="login-password" 
                    className="block text-xs font-medium text-ink"
                  >
                    Contraseña
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
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
                    className={`w-full pl-9 pr-3 py-2 rounded bg-white border text-ink text-sm placeholder-ink-muted focus:outline-none transition-colors ${
                      fieldErrors.password 
                        ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState' 
                        : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                    }`}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-roseState flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Botón de envío */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="login-submit-button"
                  className="w-full py-2.5 px-4 rounded bg-forest hover:bg-forest-hover text-white font-medium text-xs sm:text-sm shadow-subtle transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Acceder</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-surface-border text-center">
                <p className="text-xs text-ink-muted">
                  ¿No dispone de una cuenta?{' '}
                  <Link to="/registro" className="text-forest hover:underline font-medium">
                    Crear cuenta
                  </Link>
                </p>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
