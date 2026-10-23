import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Shield,
  Info,
  Server
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { validateRegistrationForm, registerAccount } from '../services/authService';

/**
 * Pantalla de registro de cuenta de usuario de la plataforma (T-34).
 * Administra la creación de usuarios para gestionar dominios y URLs según docs/modelo-datos.md.
 */
export default function RegisterAccountPage() {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [createdAccount, setCreatedAccount] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpiar el error del campo al escribir
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Validación sintáctica y de campos obligatorios en el cliente
    const validation = validateRegistrationForm(formData);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    const result = await registerAccount({
      displayName: formData.displayName,
      email: formData.email,
      password: formData.password,
    });

    setIsSubmitting(false);

    if (result.ok) {
      setCreatedAccount({
        displayName: formData.displayName,
        email: formData.email,
        uid: result.data?.uid || result.data?.id || 'uid_registrado',
        createdAt: new Date().toISOString(),
      });
    } else {
      setSubmitError({
        message: result.error,
        code: result.code,
        status: result.status,
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Encabezado y Metadatos de la Tarea */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <StatusBadge label="Tarea T-34: Registro de Cuenta" status="info" />
          <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            Colección Firestore: users/{'{uid}'}
          </span>
        </div>
        <Link
          to="/dominios/nuevo"
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
        >
          <span>Ir a Registro de Dominios</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tarjeta de Cuenta Creada Exitosamente */}
      {createdAccount ? (
        <div className="p-8 rounded-3xl glass-panel border border-emerald-500/40 bg-emerald-950/10 space-y-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">¡Cuenta creada exitosamente!</h2>
              <p className="text-sm text-slate-300 mt-1">
                La persona usuaria ha sido registrada en el sistema conforme al modelo de datos de la plataforma.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Nombre para mostrar (displayName):</span>
              <span className="text-white font-semibold">{createdAccount.displayName}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Correo electrónico (email):</span>
              <span className="text-indigo-300 font-semibold">{createdAccount.email}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-1">
              <span className="text-slate-400 font-sans">Identificador de cuenta (uid):</span>
              <span className="text-sky-300 font-semibold">{createdAccount.uid}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3 justify-center sm:justify-start">
            <Link
              to="/dominios/nuevo"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <span>Continuar al Registro de Dominio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => {
                setCreatedAccount(null);
                setFormData({ displayName: '', email: '', password: '', confirmPassword: '' });
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all cursor-pointer"
            >
              Registrar otra cuenta
            </button>
          </div>
        </div>
      ) : (
        /* Formulario de Registro de Cuenta */
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-slate-800 space-y-6">
          
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Crear Cuenta de Usuario
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Las personas usuarias de la plataforma tienen permisos para registrar y administrar dominios, definir sus políticas de caché y gestionar credenciales de acceso.
            </p>
          </div>

          {/* Banner de error al enviar */}
          {submitError && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs sm:text-sm space-y-1.5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">No fue posible registrar la cuenta</div>
                <p className="text-rose-200/90 text-xs leading-relaxed">{submitError.message}</p>
                {submitError.code && (
                  <span className="inline-block mt-1 font-mono text-[11px] bg-rose-900/60 px-2 py-0.5 rounded text-rose-300 border border-rose-800/60">
                    Código: {submitError.code}
                  </span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            
            {/* Campo: Nombre para mostrar */}
            <div className="space-y-1.5">
              <label 
                htmlFor="displayName" 
                className="block text-xs font-semibold text-slate-200 uppercase tracking-wider"
              >
                Nombre Completo o Nombre para Mostrar <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="Ej. Alexandra De Gracia"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-sm placeholder-slate-500 focus:outline-none transition-all ${
                    fieldErrors.displayName 
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' 
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
              </div>
              {fieldErrors.displayName && (
                <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{fieldErrors.displayName}</span>
                </p>
              )}
            </div>

            {/* Campo: Correo electrónico */}
            <div className="space-y-1.5">
              <label 
                htmlFor="email" 
                className="block text-xs font-semibold text-slate-200 uppercase tracking-wider"
              >
                Correo Electrónico <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="email"
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

            {/* Campos de Contraseña (en 2 columnas en desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Contraseña */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-semibold text-slate-200 uppercase tracking-wider"
                >
                  Contraseña <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="Mínimo 6 caracteres"
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

              {/* Confirmar Contraseña */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-xs font-semibold text-slate-200 uppercase tracking-wider"
                >
                  Confirmar Contraseña <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="Repita su contraseña"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-sm placeholder-slate-500 focus:outline-none transition-all ${
                      fieldErrors.confirmPassword 
                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' 
                        : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{fieldErrors.confirmPassword}</span>
                  </p>
                )}
              </div>

            </div>

            {/* Botón de Enviar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                id="register-account-submit"
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Enviando solicitud de registro...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Crear Cuenta de Usuario</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* Nota de Arquitectura del Modelo de Datos */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-slate-300">Separación de roles de usuario (docs/modelo-datos.md):</strong>
          <p className="text-[11px] leading-relaxed">
            Las personas usuarias creadas aquí corresponden a administradores de la plataforma (<code className="text-indigo-300">users/{'{uid}'}</code>). Los usuarios de URLs protegidas para el proxy de caché se configuran por separado en cada ruta y nunca se mezclan.
          </p>
        </div>
      </div>

    </div>
  );
}
