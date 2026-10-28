import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, 
  Server, 
  HardDrive, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Info,
  HelpCircle
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import DomainVerificationCard from '../components/DomainVerificationCard';
import { 
  normalizeDomain, 
  validateDomainForm, 
  validateDomainSyntax, 
  registerDomain 
} from '../services/domainService';

// Tamaños de caché comunes para selección rápida (en bytes)
const CACHE_SIZE_PRESETS = [
  { label: '50 MB', bytes: 52428800 },
  { label: '100 MB', bytes: 104857600 },
  { label: '250 MB', bytes: 262144000 },
  { label: '500 MB', bytes: 524288000 },
  { label: '1 GB', bytes: 1073741824 },
];

/**
 * Pantalla de registro de dominios y verificación de propiedad mediante registro DNS TXT (T-34).
 * Basado en las especificaciones del modelo de datos de Firestore en docs/modelo-datos.md.
 */
export default function RegisterDomainPage() {
  const [formData, setFormData] = useState({
    name: '',
    originScheme: 'http',
    originHost: '',
    originPort: '80',
    cacheSizeBytes: 104857600, // 100 MB por defecto
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [registeredDomain, setRegisteredDomain] = useState(null);

  // Formato legible en MB para el tamaño de caché
  const formatBytesToMb = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 MB';
    return `${(Number(bytes) / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDomainNameChange = (e) => {
    const rawValue = e.target.value;
    setFormData((prev) => ({ ...prev, name: rawValue }));

    if (fieldErrors.name) {
      setFieldErrors((prev) => ({ ...prev, name: null }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Ajustar puerto por defecto al cambiar el esquema si el puerto estaba en default
      if (name === 'originScheme') {
        if (value === 'https' && (prev.originPort === '80' || !prev.originPort)) {
          next.originPort = '443';
        } else if (value === 'http' && (prev.originPort === '443' || !prev.originPort)) {
          next.originPort = '80';
        }
      }
      return next;
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handlePresetCache = (bytes) => {
    setFormData((prev) => ({ ...prev, cacheSizeBytes: bytes }));
    if (fieldErrors.cacheSizeBytes) {
      setFieldErrors((prev) => ({ ...prev, cacheSizeBytes: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Validación completa en el cliente antes de enviar
    const validation = validateDomainForm(formData);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    const result = await registerDomain(formData);

    setIsSubmitting(false);

    if (result.ok) {
      // El backend devuelve los datos del dominio con el token de verificación generado
      const token = result.data?.verification?.token || result.data?.token || 'TOKEN_PENDIENTE';
      const status = result.data?.verification?.status || 'pending';

      setRegisteredDomain({
        name: normalizeDomain(formData.name),
        origin: {
          scheme: formData.originScheme,
          host: formData.originHost.trim(),
          port: Number(formData.originPort),
        },
        cacheSizeBytes: Number(formData.cacheSizeBytes),
        verificationToken: token,
        verificationStatus: status,
      });
    } else {
      setSubmitError({
        message: result.error,
        code: result.code,
        status: result.status,
      });
    }
  };

  const normalizedPreview = normalizeDomain(formData.name);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Encabezado y Metadatos de la Tarea */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <StatusBadge label="Tarea T-34: Registro y Verificación de Dominio" status="info" />
          <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            Colección: domains/{'{domain}'}
          </span>
        </div>
        <Link
          to="/registro"
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
        >
          <span>Crear cuenta de usuario</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Si se acaba de registrar un dominio exitosamente, mostramos la tarjeta de verificación DNS TXT */}
      {registeredDomain ? (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl glass-panel border border-emerald-500/40 bg-emerald-950/10 space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-white">Dominio Registrado en el Sistema</h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  El dominio <strong className="text-white font-mono">{registeredDomain.name}</strong> ha sido dado de alta. Complete el paso de verificación de propiedad por DNS para que el proxy zonal comience a interceptar peticiones.
                </p>
              </div>
            </div>
          </div>

          <DomainVerificationCard
            domain={registeredDomain.name}
            verificationToken={registeredDomain.verificationToken}
            initialStatus={registeredDomain.verificationStatus}
          />

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setRegisteredDomain(null);
                setFormData({
                  name: '',
                  originScheme: 'http',
                  originHost: '',
                  originPort: '80',
                  cacheSizeBytes: 104857600,
                });
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium transition-all cursor-pointer"
            >
              Registrar otro dominio
            </button>
          </div>
        </div>
      ) : (
        /* Formulario de Registro de Dominio */
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-slate-800 space-y-6">
          
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Registrar Nuevo Dominio
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
              Registre un dominio para asociarlo a las cachés zonales. Como el DNS Interceptor redirige el dominio hacia la caché zonal, debe configurarse explícitamente el servidor de origen real y el tamaño máximo de caché.
            </p>
          </div>

          {/* Banner de error al enviar */}
          {submitError && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs sm:text-sm space-y-1.5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">No fue posible registrar el dominio</div>
                <p className="text-rose-200/90 text-xs leading-relaxed">{submitError.message}</p>
                {submitError.code && (
                  <span className="inline-block mt-1 font-mono text-[11px] bg-rose-900/60 px-2 py-0.5 rounded text-rose-300 border border-rose-800/60">
                    Código: {submitError.code}
                  </span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            {/* SECCIÓN 1: Nombre del Dominio */}
            <div className="space-y-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="domainName" 
                  className="block text-xs font-semibold text-slate-200 uppercase tracking-wider"
                >
                  Nombre del Dominio (FQDN) <span className="text-rose-400">*</span>
                </label>
                {normalizedPreview && (
                  <span className="text-[11px] font-mono text-slate-400">
                    ID en Firestore: <code className="text-sky-300 font-semibold">{normalizedPreview}</code>
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="domainName"
                  name="name"
                  value={formData.name}
                  onChange={handleDomainNameChange}
                  disabled={isSubmitting}
                  placeholder="ejemplo.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-sm font-mono placeholder-slate-500 focus:outline-none transition-all ${
                    fieldErrors.name 
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' 
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
              </div>

              {fieldErrors.name ? (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{fieldErrors.name}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Introduzca únicamente el dominio sin protocolo (sin <code className="text-slate-300">http://</code>) ni rutas. El sistema lo normaliza automáticamente a minúsculas y sin punto final.
                </p>
              )}
            </div>

            {/* SECCIÓN 2: Servidor de Origen */}
            <div className="space-y-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Servidor de Origen Real (docs/modelo-datos.md)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                
                {/* Esquema (http / https) */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label htmlFor="originScheme" className="block text-xs font-semibold text-slate-300">
                    Esquema <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="originScheme"
                    name="originScheme"
                    value={formData.originScheme}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="http">http://</option>
                    <option value="https">https://</option>
                  </select>
                </div>

                {/* Host o IP del origen */}
                <div className="sm:col-span-6 space-y-1.5">
                  <label htmlFor="originHost" className="block text-xs font-semibold text-slate-300">
                    Host o IP del Origen <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="originHost"
                    name="originHost"
                    value={formData.originHost}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="apache.default.svc.cluster.local o 192.168.1.100"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-sm font-mono placeholder-slate-500 focus:outline-none transition-all ${
                      fieldErrors.originHost 
                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' 
                        : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.originHost && (
                    <p className="text-xs text-rose-400 mt-1">{fieldErrors.originHost}</p>
                  )}
                </div>

                {/* Puerto del origen */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label htmlFor="originPort" className="block text-xs font-semibold text-slate-300">
                    Puerto <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    id="originPort"
                    name="originPort"
                    min="1"
                    max="65535"
                    value={formData.originPort}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="80"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-sm font-mono placeholder-slate-500 focus:outline-none transition-all ${
                      fieldErrors.originPort 
                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' 
                        : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.originPort && (
                    <p className="text-xs text-rose-400 mt-1">{fieldErrors.originPort}</p>
                  )}
                </div>

              </div>
            </div>

            {/* SECCIÓN 3: Tamaño Máximo de Caché (en bytes) */}
            <div className="space-y-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <label 
                    htmlFor="cacheSizeBytes" 
                    className="block text-xs font-semibold text-slate-200 uppercase tracking-wider"
                  >
                    Tamaño Máximo de Caché en Disco (bytes) <span className="text-rose-400">*</span>
                  </label>
                </div>
                <span className="text-xs font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                  {formatBytesToMb(formData.cacheSizeBytes)}
                </span>
              </div>

              {/* Presets rápidos */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Valores rápidos:</span>
                {CACHE_SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.bytes}
                    type="button"
                    onClick={() => handlePresetCache(preset.bytes)}
                    disabled={isSubmitting}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                      Number(formData.cacheSizeBytes) === preset.bytes
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <input
                type="number"
                id="cacheSizeBytes"
                name="cacheSizeBytes"
                min="1048576"
                step="1048576"
                value={formData.cacheSizeBytes}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border text-slate-100 text-sm font-mono placeholder-slate-500 focus:outline-none transition-all ${
                  fieldErrors.cacheSizeBytes 
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' 
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />

              {fieldErrors.cacheSizeBytes ? (
                <p className="text-xs text-rose-400 mt-1">{fieldErrors.cacheSizeBytes}</p>
              ) : (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Límite máximo para todo el dominio. La suma de los tamaños de caché asignados a sus URLs hijas en T-37 no podrá superarlo.
                </p>
              )}
            </div>

            {/* Botón de Envío */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                id="register-domain-submit"
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Guardando dominio en el sistema...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Registrar Dominio y Obtener Registro TXT</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* Explicación de la Verificación DNS TXT */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-slate-300">Mecanismo de Verificación por Registro TXT:</strong>
          <p className="text-[11px] leading-relaxed">
            Al registrar el dominio, el API genera un token criptográfico único (<code className="text-indigo-300">verification.token</code>) y responde con el registro que debe publicarse (<code className="text-sky-300">_proxycache-verify.&lt;dominio&gt;</code>). Solo los dominios verificados se exponen a las cachés zonales y al DNS Interceptor.
          </p>
        </div>
      </div>

    </div>
  );
}
