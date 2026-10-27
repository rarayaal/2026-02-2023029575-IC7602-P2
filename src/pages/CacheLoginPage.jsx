/**
 * Formulario de autenticación y gestión de sesión para Cachés Zonales (T-39).
 * 
 * Permite a los usuarios de URLs protegidas mediante autenticación user_password
 * identificarse ante la plataforma, recibir el token de sesión emitido por el backend
 * y redirigirse de vuelta a la caché zonal para que ésta escriba la cookie zc_session.
 * 
 * Flujo de ejecución (docs/contrato-cache-api.md §3):
 * 1. Zonal Cache detecta petición sin cookie a URL protegida.
 * 2. Zonal Cache envía 302 a: /login?domain=...&urlId=...&redirect=...
 * 3. Este componente captura los query params y presenta el formulario.
 * 4. Al enviar, llama a POST /api/sessions ({ domain, urlId, username, password }).
 * 5. Con el sessionToken, redirige a:
 *    http://<domain>/__zc/session?token=<st_...>&redirect=<redirect>
 * 6. También provee funcionalidad directa para cerrar sesión (DELETE /api/sessions).
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
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <StatusBadge label="Caché Zonal" status="success" />
          <span className="text-xs text-slate-400 font-mono">T-39</span>
        </div>
        <div className="text-xs text-slate-400">
          Autenticación de URL Protegida
        </div>
      </div>

      {/* Tarjeta de Sesión Activa (si existe) */}
      {activeSession && (
        <div className="p-6 rounded-3xl glass-panel border border-emerald-500/30 bg-emerald-950/10 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Sesión Activa de Caché</h2>
                <p className="text-xs text-slate-300">
                  Usuario autenticado: <span className="font-mono text-emerald-300 font-semibold">{activeSession.username}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              id="cache-logout-button"
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Cerrar Sesión</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <span className="text-slate-400 block text-[11px]">Dominio:</span>
              <span className="text-slate-200 font-mono font-medium">{activeSession.domain}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Identificador de URL:</span>
              <span className="text-slate-200 font-mono font-medium">{activeSession.urlId}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block text-[11px]">Token de Sesión (hash seguro):</span>
              <span className="text-indigo-300 font-mono text-[11px] break-all">
                {activeSession.sessionToken ? `${activeSession.sessionToken.slice(0, 16)}...` : '(sin token)'}
              </span>
            </div>
            {activeSession.expiresAt && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[11px]">Expiración programada:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {new Date(activeSession.expiresAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banner de Éxito al Generar Sesión */}
      {sessionSuccess && (
        <div className="p-6 rounded-3xl glass-panel border border-indigo-500/40 bg-indigo-950/20 space-y-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Sesión Generada con Éxito</h3>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                El token de sesión fue emitido por el backend. Redirigiendo a la caché zonal para fijar la cookie <code className="font-mono text-indigo-100">zc_session</code>.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <a
              href={sessionSuccess.redirectUrl}
              id="continue-to-cache-link"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continuar hacia {sessionSuccess.targetDomain}{sessionSuccess.targetRedirect}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Mensaje de cierre de sesión exitoso */}
      {logoutMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{logoutMessage}</span>
        </div>
      )}

      {/* Mensaje de error general */}
      {loginError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-white">Error en autenticación</div>
            <p className="text-rose-200/90 leading-relaxed">{loginError}</p>
          </div>
        </div>
      )}

      {/* Formulario Principal de Autenticación */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-slate-800 space-y-6">
        
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Acceso a Recurso en Caché Zonal
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Esta URL está protegida por una caché zonal de aplicación. Ingrese las credenciales autorizadas para este dominio y recurso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          
          {/* Fila: Dominio e Identificador de URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Campo: Dominio */}
            <div className="space-y-1.5">
              <label htmlFor="cache-domain" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Dominio
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                  className={`w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-xs font-mono placeholder-slate-500 focus:outline-none transition-all ${
                    fieldErrors.domain
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
              </div>
              {fieldErrors.domain && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{fieldErrors.domain}</span>
                </p>
              )}
            </div>

            {/* Campo: urlId */}
            <div className="space-y-1.5">
              <label htmlFor="cache-url-id" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                ID de URL (urlId)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                  className={`w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-xs font-mono placeholder-slate-500 focus:outline-none transition-all ${
                    fieldErrors.urlId
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
              </div>
              {fieldErrors.urlId && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{fieldErrors.urlId}</span>
                </p>
              )}
            </div>

          </div>

          {/* Campo: Usuario */}
          <div className="space-y-1.5">
            <label htmlFor="cache-username" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Nombre de Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="cache-username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="Nombre de usuario registrado en la URL"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-sm placeholder-slate-500 focus:outline-none transition-all ${
                  fieldErrors.username
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
            </div>
            {fieldErrors.username && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{fieldErrors.username}</span>
              </p>
            )}
          </div>

          {/* Campo: Contraseña */}
          <div className="space-y-1.5">
            <label htmlFor="cache-password" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                id="cache-password"
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
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          {/* Campo: Ruta de Destino / Redirección */}
          <div className="space-y-1.5">
            <label htmlFor="cache-redirect" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
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
              className="w-full px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <p className="text-[11px] text-slate-500">
              Ruta a la que se retornará en el dominio tras validar la sesión.
            </p>
          </div>

          {/* Botón de Autenticación */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              id="cache-submit-button"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <Link
            to="/login"
            className="text-slate-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <span>Portal de administración</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <span className="text-[11px] text-slate-500 font-mono">Cookie: zc_session</span>
        </div>

      </div>

      {/* Nota de Seguridad */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-2.5">
        <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>
          Las credenciales se transmiten de forma cifrada mediante HTTPS hacia el endpoint <code className="text-slate-300 font-mono">POST /api/sessions</code>. Ninguna contraseña es guardada en el navegador.
        </span>
      </div>

    </div>
  );
}
