import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight
} from 'lucide-react';
import { validateRegistrationForm } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

export default function RegisterAccountPage() {
  const { register } = useAuth();
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

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateRegistrationForm(formData);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    const result = await register(
      formData.displayName,
      formData.email,
      formData.password
    );

    setIsSubmitting(false);

    if (result.ok) {
      setCreatedAccount({
        displayName: formData.displayName,
        email: formData.email,
        uid: result.data?.uid || result.user?.uid || result.data?.id || 'uid_registrado',
        createdAt: new Date().toISOString(),
        hasSession: Boolean(result.user),
        autoLoginError: result.autoLoginError || null,
        note: result.note || null,
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
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn py-6">
      
      {/* Tarjeta de Cuenta Creada Exitosamente */}
      {createdAccount ? (
        <div className="p-8 rounded-lg bg-surface border border-surface-border shadow-card space-y-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded bg-forest-subtle text-forest border border-forest/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">Cuenta Creada</h2>
              <p className="text-xs text-ink-secondary mt-1">
                La persona usuaria ha sido registrada exitosamente en la plataforma.
              </p>
            </div>
          </div>

          <div className="p-4 rounded bg-surface-subtle border border-surface-border space-y-2 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-surface-border">
              <span className="text-ink-muted font-sans">Nombre:</span>
              <span className="text-ink font-semibold">{createdAccount.displayName}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-surface-border">
              <span className="text-ink-muted font-sans">Correo electrónico:</span>
              <span className="text-ink font-semibold">{createdAccount.email}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-surface-border">
              <span className="text-ink-muted font-sans">Identificador (UID):</span>
              <span className="text-forest font-semibold">{createdAccount.uid}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-1">
              <span className="text-ink-muted font-sans">Estado de sesión:</span>
              <span className={createdAccount.hasSession ? "text-forest font-semibold" : "text-amberState"}>
                {createdAccount.hasSession ? "Autenticado con sesión activa" : (createdAccount.note || "Requiere inicio de sesión")}
              </span>
            </div>
          </div>

          {createdAccount.autoLoginError && (
            <div className="p-3 rounded bg-amberState-subtle border border-amberState-border text-amberState text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amberState" />
              <span>Cuenta creada. El inicio automático no se completó: {createdAccount.autoLoginError}.</span>
            </div>
          )}

          <div className="pt-2 flex flex-wrap gap-3 justify-center sm:justify-start">
            <Link
              to="/dominios/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-forest hover:bg-forest-hover text-white text-xs sm:text-sm font-medium shadow-subtle transition-colors cursor-pointer"
            >
              <span>Registrar un dominio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/dominios"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-surface hover:bg-surface-subtle text-ink text-xs sm:text-sm font-medium border border-surface-border transition-colors cursor-pointer"
            >
              <span>Ver dominios</span>
            </Link>
            <button
              onClick={() => {
                setCreatedAccount(null);
                setFormData({ displayName: '', email: '', password: '', confirmPassword: '' });
              }}
              className="px-4 py-2.5 rounded bg-surface hover:bg-surface-subtle text-ink-secondary hover:text-ink text-xs sm:text-sm font-medium border border-surface-border transition-colors cursor-pointer"
            >
              Registrar otra cuenta
            </button>
          </div>
        </div>
      ) : (
        /* Formulario de Registro de Cuenta */
        <div className="p-6 sm:p-8 rounded-lg bg-surface border border-surface-border shadow-card space-y-6">
          
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="font-serif text-2xl font-bold text-ink">
              Crear Cuenta
            </h1>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Cree una cuenta para registrar dominios y configurar políticas de aceleración y caché.
            </p>
          </div>

          {/* Banner de error al enviar */}
          {submitError && (
            <div className="p-3.5 rounded bg-roseState-subtle border border-roseState-border text-roseState text-xs space-y-1 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-roseState shrink-0 mt-0.5" />
              <div>
                <span className="font-medium block">No fue posible registrar la cuenta</span>
                <p className="text-[11px] leading-relaxed">{submitError.message}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* Campo: Nombre para mostrar */}
            <div className="space-y-1">
              <label 
                htmlFor="displayName" 
                className="block text-xs font-medium text-ink"
              >
                Nombre Completo <span className="text-roseState">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="Ej. Ana Morales"
                  className={`w-full pl-9 pr-3 py-2 rounded bg-white border text-ink text-sm placeholder-ink-muted focus:outline-none transition-colors ${
                    fieldErrors.displayName 
                      ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState' 
                      : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                  }`}
                />
              </div>
              {fieldErrors.displayName && (
                <p className="text-xs text-roseState flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{fieldErrors.displayName}</span>
                </p>
              )}
            </div>

            {/* Campo: Correo electrónico */}
            <div className="space-y-1">
              <label 
                htmlFor="email" 
                className="block text-xs font-medium text-ink"
              >
                Correo Electrónico <span className="text-roseState">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
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

            {/* Campos de Contraseña */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Contraseña */}
              <div className="space-y-1">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-medium text-ink"
                >
                  Contraseña <span className="text-roseState">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
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

              {/* Confirmar Contraseña */}
              <div className="space-y-1">
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-xs font-medium text-ink"
                >
                  Confirmar <span className="text-roseState">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="Repita contraseña"
                    className={`w-full pl-9 pr-3 py-2 rounded bg-white border text-ink text-sm placeholder-ink-muted focus:outline-none transition-colors ${
                      fieldErrors.confirmPassword 
                        ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState' 
                        : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                    }`}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-roseState flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
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
                className="w-full py-2.5 px-4 rounded bg-forest hover:bg-forest-hover text-white font-medium text-xs sm:text-sm shadow-subtle transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registrando cuenta...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Crear cuenta</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-3 border-t border-surface-border text-center">
              <p className="text-xs text-ink-muted">
                ¿Ya dispone de una cuenta?{' '}
                <Link to="/login" className="text-forest hover:underline font-medium">
                  Iniciar sesión
                </Link>
              </p>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
