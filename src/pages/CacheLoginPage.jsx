/**
 * Formulario de autenticación y gestión de sesión para Cachés Zonales.
 * 
 * Permite a los usuarios de URLs protegidas mediante autenticación user_password
 * identificarse ante la plataforma, recibir el token de sesión emitido por el backend
 * y redirigirse de vuelta a la caché zonal para que ésta escriba la cookie zc_session.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  User,
  Globe,
  Link2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  LogOut,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import {
  createSession,
  deleteSession,
  buildCacheRedirectUrl,
  sanitizeRedirectPath,
  getLocalSession,
} from '../services/sessionService';

export default function CacheLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Query params recibidos desde la redirección del Zonal Cache
  const paramDomain = searchParams.get('domain') || '';
  const paramUrlId = searchParams.get('urlId') || '';
  const paramRedirect = searchParams.get('redirect') || '';

  // Estado del formulario
  const [formData, setFormData] = useState({
    domain: paramDomain,
    urlId: paramUrlId,
    username: '',
    password: '',
    redirect: paramRedirect || '/',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionSuccess, setSessionSuccess] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState(null);

  // Sincronizar parámetros si cambian en la URL
  useEffect(() => {
    if (paramDomain || paramUrlId || paramRedirect) {
      setFormData((prev) => ({
        ...prev,
        domain: paramDomain || prev.domain,
        urlId: paramUrlId || prev.urlId,
        redirect: paramRedirect || prev.redirect,
      }));
    }
  }, [paramDomain, paramUrlId, paramRedirect]);

  // Verificar si ya existe una sesión activa localmente
  useEffect(() => {
    const session = getLocalSession();
    if (session) {
      setActiveSession(session);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (loginError) {
      setLoginError(null);
    }
    if (logoutMessage) {
      setLogoutMessage(null);
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.domain || !formData.domain.trim()) {
      errors.domain = 'El nombre de dominio es obligatorio';
    } else if (formData.domain.includes('/')) {
      errors.domain = 'El dominio no debe contener "/"';
    }

    if (!formData.urlId || !formData.urlId.trim()) {
      errors.urlId = 'El identificador de URL es obligatorio';
    } else if (formData.urlId.includes('/')) {
      errors.urlId = 'El urlId no debe contener "/"';
    }

    if (!formData.username || !formData.username.trim()) {
      errors.username = 'El usuario es obligatorio';
    } else if (formData.username.includes('/')) {
      errors.username = 'El usuario no debe contener "/"';
    }

    if (!formData.password || !formData.password.trim()) {
      errors.password = 'La contraseña es obligatoria';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLogoutMessage(null);

    const validation = validate();
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    const result = await createSession({
      domain: formData.domain,
      urlId: formData.urlId,
      username: formData.username,
      password: formData.password,
    });
    setIsSubmitting(false);
    setFormData((prev) => ({ ...prev, password: '' }));

    if (result.ok) {
      const redirectUrl = buildCacheRedirectUrl(
        formData.domain,
        result.sessionToken,
        formData.redirect
      );

      setSessionSuccess({
        sessionToken: result.sessionToken,
        expiresAt: result.expiresAt,
        redirectUrl,
        targetDomain: formData.domain,
        targetRedirect: sanitizeRedirectPath(formData.redirect),
      });

      setActiveSession(getLocalSession());

      // Redirección automática si viene originado de una petición real a la caché
      if (paramDomain && paramRedirect) {
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1200);
      }
    } else {
      setLoginError(result.error);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLoginError(null);

    const tokenToRevoke = activeSession?.sessionToken || sessionSuccess?.sessionToken;
    const result = await deleteSession(tokenToRevoke);

    setIsLoggingOut(false);
    setActiveSession(null);
    setSessionSuccess(null);

    if (result.ok) {
      setLogoutMessage('La sesión fue revocada exitosamente en el servidor.');
    } else {
      setLoginError(result.error || 'Ocurrió un inconveniente al revocar la sesión.');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn py-6 px-4 sm:px-0">
      
      {/* Encabezado y Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <StatusBadge label="Caché Zonal" status="success" />
        </div>
        <div className="text-xs text-ink-secondary font-medium">
          Autenticación de URL Protegida
        </div>
      </div>

      {/* Tarjeta de Sesión Activa (si existe) */}
      {activeSession && (
        <div className="p-6 rounded-lg bg-surface shadow-card border border-forest/30 bg-forest-subtle/30 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-forest-subtle text-forest border border-forest/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-ink">Sesión Activa de Caché</h2>
                <p className="text-xs text-ink-secondary">
                  Usuario autenticado: <span className="font-mono text-forest font-semibold">{activeSession.username}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              id="cache-logout-button"
              className="px-3 py-1.5 rounded bg-surface hover:bg-surface-subtle text-roseState border border-surface-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Cerrar Sesión</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-surface-subtle p-3.5 rounded-lg border border-surface-border">
            <div>
              <span className="text-ink-muted block text-[11px] font-medium">Dominio:</span>
              <span className="text-ink font-mono font-medium">{activeSession.domain}</span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px] font-medium">Identificador de URL:</span>
              <span className="text-ink font-mono font-medium">{activeSession.urlId}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-ink-muted block text-[11px] font-medium">Token de Sesión:</span>
              <span className="text-forest font-mono text-[11px] break-all">
                {activeSession.sessionToken ? `${activeSession.sessionToken.slice(0, 16)}...` : '(sin token)'}
              </span>
            </div>
            {activeSession.expiresAt && (
              <div className="sm:col-span-2">
                <span className="text-ink-muted block text-[11px] font-medium">Expiración programada:</span>
                <span className="text-ink-secondary font-mono text-[11px]">
                  {new Date(activeSession.expiresAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banner de Éxito al Generar Sesión */}
      {sessionSuccess && (
        <div className="p-6 rounded-lg bg-surface shadow-card border border-forest/30 bg-forest-subtle/40 space-y-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded bg-forest-subtle text-forest border border-forest/30 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-ink">Sesión Generada con Éxito</h3>
              <p className="text-xs text-ink-secondary mt-0.5">
                El token de sesión fue emitido por el backend. Redirigiendo a la caché zonal para fijar la cookie <code className="font-mono text-forest font-semibold">zc_session</code>.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <a
              href={sessionSuccess.redirectUrl}
              id="continue-to-cache-link"
              className="w-full py-2.5 px-4 rounded bg-forest hover:bg-forest-hover text-white shadow-subtle font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continuar hacia {sessionSuccess.targetDomain}{sessionSuccess.targetRedirect}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Mensaje de cierre de sesión exitoso */}
      {logoutMessage && (
        <div className="p-3.5 rounded bg-forest-subtle border border-forest/30 text-forest text-xs font-medium flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
          <span>{logoutMessage}</span>
        </div>
      )}

      {/* Mensaje de error general */}
      {loginError && (
        <div className="p-4 rounded bg-roseState-subtle border border-roseState-border text-roseState text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-roseState shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-roseState">Error en autenticación</div>
            <p className="text-xs leading-relaxed">{loginError}</p>
          </div>
        </div>
      )}

      {/* Formulario Principal de Autenticación */}
      <div className="p-6 sm:p-8 rounded-lg bg-surface shadow-card border border-surface-border space-y-6">
        
        <div className="space-y-2">
          <div className="w-10 h-10 rounded bg-forest-subtle border border-forest/20 text-forest flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink tracking-tight">
            Acceso a Recurso en Caché Zonal
          </h1>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Esta URL está protegida por una caché zonal de aplicación. Ingrese las credenciales autorizadas para este dominio y recurso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          
          {/* Fila: Dominio e Identificador de URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Campo: Dominio */}
            <div className="space-y-1.5">
              <label htmlFor="cache-domain" className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Dominio
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="cache-domain"
                  name="domain"
                  value={formData.domain}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="ej. example.com o app.local"
                  className={`w-full pl-9 pr-3 py-2 rounded bg-white border text-ink text-xs font-mono placeholder-ink-muted focus:outline-none transition-colors ${
                    fieldErrors.domain
                      ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState'
                      : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                  }`}
                />
              </div>
              {fieldErrors.domain && (
                <p className="text-[11px] text-roseState flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{fieldErrors.domain}</span>
                </p>
              )}
            </div>

            {/* Campo: urlId */}
            <div className="space-y-1.5">
              <label htmlFor="cache-url-id" className="block text-xs font-semibold text-ink uppercase tracking-wider">
                ID de URL (urlId)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                  <Link2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="cache-url-id"
                  name="urlId"
                  value={formData.urlId}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="ej. u1 o u2"
                  className={`w-full pl-9 pr-3 py-2 rounded bg-white border text-ink text-xs font-mono placeholder-ink-muted focus:outline-none transition-colors ${
                    fieldErrors.urlId
                      ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState'
                      : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                  }`}
                />
              </div>
              {fieldErrors.urlId && (
                <p className="text-[11px] text-roseState flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{fieldErrors.urlId}</span>
                </p>
              )}
            </div>

          </div>

          {/* Campo: Usuario */}
          <div className="space-y-1.5">
            <label htmlFor="cache-username" className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Nombre de Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="cache-username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="username"
                placeholder="Nombre de usuario registrado en la URL"
                className={`w-full pl-9 pr-3 py-2 rounded bg-white border text-ink text-sm placeholder-ink-muted focus:outline-none transition-colors ${
                  fieldErrors.username
                    ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState'
                    : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                }`}
              />
            </div>
            {fieldErrors.username && (
              <p className="text-[11px] text-roseState flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{fieldErrors.username}</span>
              </p>
            )}
          </div>

          {/* Campo: Contraseña */}
          <div className="space-y-1.5">
            <label htmlFor="cache-password" className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                id="cache-password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="new-password"
                placeholder="••••••••"
                className={`w-full pl-9 pr-3 py-2 rounded bg-white border text-ink text-sm placeholder-ink-muted focus:outline-none transition-colors ${
                  fieldErrors.password
                    ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState'
                    : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                }`}
              />
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] text-roseState flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          {/* Campo: Ruta de Destino / Redirección */}
          <div className="space-y-1.5">
            <label htmlFor="cache-redirect" className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Ruta de Destino (Redirect)
            </label>
            <input
              type="text"
              id="cache-redirect"
              name="redirect"
              value={formData.redirect}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="/admin/panel"
              className="w-full px-3 py-2 rounded bg-white border border-surface-border text-ink text-xs font-mono placeholder-ink-muted focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest transition-colors"
            />
            <p className="text-[11px] text-ink-muted">
              Ruta a la que se retornará en el dominio tras validar la sesión.
            </p>
          </div>

          {/* Botón de Autenticación */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              id="cache-submit-button"
              className="w-full py-2.5 px-4 rounded bg-forest hover:bg-forest-hover text-white shadow-subtle font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando con la API...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Autenticar y Establecer Sesión</span>
                </>
              )}
            </button>
          </div>

        </form>

        <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs">
          <Link
            to="/login"
            className="text-ink-secondary hover:text-forest transition-colors flex items-center gap-1 font-medium"
          >
            <span>Portal de administración</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span className="text-[11px] text-ink-muted font-mono">Cookie: zc_session</span>
        </div>

      </div>

      {/* Nota de Seguridad */}
      <div className="p-3.5 rounded bg-surface border border-surface-border text-xs text-ink-secondary shadow-card flex items-center gap-2.5">
        <ShieldAlert className="w-4 h-4 text-forest shrink-0" />
        <span>
          Las credenciales se transmiten de forma cifrada mediante HTTPS hacia el endpoint <code className="text-ink font-mono font-medium">POST /api/sessions</code>. Ninguna contraseña es guardada en el navegador.
        </span>
      </div>

    </div>
  );
}
