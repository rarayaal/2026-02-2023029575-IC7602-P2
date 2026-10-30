import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, 
  Server, 
  HardDrive, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';
import DomainVerificationCard from '../components/DomainVerificationCard';
import { 
  normalizeDomain, 
  validateDomainForm, 
  registerDomain 
} from '../services/domainService';

const CACHE_SIZE_PRESETS = [
  { label: '50 MB', bytes: 52428800 },
  { label: '100 MB', bytes: 104857600 },
  { label: '250 MB', bytes: 262144000 },
  { label: '500 MB', bytes: 524288000 },
  { label: '1 GB', bytes: 1073741824 },
];

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

    const validation = validateDomainForm(formData);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    const result = await registerDomain(formData);

    setIsSubmitting(false);

    if (result.ok) {
      const txtRecord = result.data?.txtRecord || null;
      const status = result.data?.verification?.status || 'pending';

      setRegisteredDomain({
        name: normalizeDomain(formData.name),
        origin: {
          scheme: formData.originScheme,
          host: formData.originHost.trim(),
          port: Number(formData.originPort),
        },
        cacheSizeBytes: Number(formData.cacheSizeBytes),
        txtRecord,
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
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn py-6">
      
      {/* Si se acaba de registrar un dominio exitosamente, mostramos la tarjeta de verificación DNS TXT */}
      {registeredDomain ? (
        <div className="space-y-6">
          <div className="p-6 rounded-lg bg-surface border border-surface-border shadow-card space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-forest shrink-0" />
              <div>
                <h2 className="font-serif text-xl font-bold text-ink">Dominio Registrado</h2>
                <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
                  El dominio <strong className="text-ink font-mono">{registeredDomain.name}</strong> ha sido dado de alta. Complete el paso de verificación de propiedad para activar la caché perimetral.
                </p>
              </div>
            </div>
          </div>

          <DomainVerificationCard
            domain={registeredDomain.name}
            txtRecord={registeredDomain.txtRecord}
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
              className="px-4 py-2 rounded bg-surface hover:bg-surface-subtle text-ink-secondary hover:text-ink text-xs sm:text-sm font-medium border border-surface-border transition-colors cursor-pointer"
            >
              Registrar otro dominio
            </button>
          </div>
        </div>
      ) : (
        /* Formulario de Registro de Dominio */
        <div className="p-6 sm:p-8 rounded-lg bg-surface border border-surface-border shadow-card space-y-6">
          
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="font-serif text-2xl font-bold text-ink">
              Registrar Dominio
            </h1>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Configure el servidor de origen real y la cuota de almacenamiento para la caché perimetral.
            </p>
          </div>

          {/* Banner de error al enviar */}
          {submitError && (
            <div className="p-3.5 rounded bg-roseState-subtle border border-roseState-border text-roseState text-xs space-y-1 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-roseState shrink-0 mt-0.5" />
              <div>
                <span className="font-medium block">No fue posible registrar el dominio</span>
                <p className="text-[11px] leading-relaxed">{submitError.message}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            {/* SECCIÓN 1: Nombre del Dominio */}
            <div className="space-y-2 pb-4 border-b border-surface-border">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="domainName" 
                  className="block text-xs font-medium text-ink"
                >
                  Nombre del Dominio (FQDN) <span className="text-roseState">*</span>
                </label>
                {normalizedPreview && (
                  <span className="text-[11px] font-mono text-ink-muted">
                    Normalizado: <code className="text-forest font-semibold">{normalizedPreview}</code>
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
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
                  className={`w-full pl-9 pr-3 py-2 rounded bg-white border text-ink text-sm font-mono placeholder-ink-muted focus:outline-none transition-colors ${
                    fieldErrors.name 
                      ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState' 
                      : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                  }`}
                />
              </div>

              {fieldErrors.name ? (
                <p className="text-xs text-roseState flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{fieldErrors.name}</span>
                </p>
              ) : (
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Introduzca únicamente el dominio sin esquema ni rutas.
                </p>
              )}
            </div>

            {/* SECCIÓN 2: Servidor de Origen */}
            <div className="space-y-3 pb-4 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-forest" />
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">
                  Servidor de Origen Real
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                
                {/* Esquema (http / https) */}
                <div className="sm:col-span-3 space-y-1">
                  <label htmlFor="originScheme" className="block text-xs font-medium text-ink">
                    Esquema <span className="text-roseState">*</span>
                  </label>
                  <select
                    id="originScheme"
                    name="originScheme"
                    value={formData.originScheme}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 rounded bg-white border border-surface-border text-ink text-sm font-mono focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
                  >
                    <option value="http">http://</option>
                    <option value="https">https://</option>
                  </select>
                </div>

                {/* Host o IP del origen */}
                <div className="sm:col-span-6 space-y-1">
                  <label htmlFor="originHost" className="block text-xs font-medium text-ink">
                    Host o IP del Origen <span className="text-roseState">*</span>
                  </label>
                  <input
                    type="text"
                    id="originHost"
                    name="originHost"
                    value={formData.originHost}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="origen.interno.local o 192.168.1.10"
                    className={`w-full px-3 py-2 rounded bg-white border text-ink text-sm font-mono placeholder-ink-muted focus:outline-none transition-colors ${
                      fieldErrors.originHost 
                        ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState' 
                        : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                    }`}
                  />
                  {fieldErrors.originHost && (
                    <p className="text-xs text-roseState mt-1">{fieldErrors.originHost}</p>
                  )}
                </div>

                {/* Puerto del origen */}
                <div className="sm:col-span-3 space-y-1">
                  <label htmlFor="originPort" className="block text-xs font-medium text-ink">
                    Puerto <span className="text-roseState">*</span>
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
                    className={`w-full px-3 py-2 rounded bg-white border text-ink text-sm font-mono placeholder-ink-muted focus:outline-none transition-colors ${
                      fieldErrors.originPort 
                        ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState' 
                        : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                    }`}
                  />
                  {fieldErrors.originPort && (
                    <p className="text-xs text-roseState mt-1">{fieldErrors.originPort}</p>
                  )}
                </div>

              </div>
            </div>

            {/* SECCIÓN 3: Tamaño Máximo de Caché */}
            <div className="space-y-3 pb-4 border-b border-surface-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-forest" />
                  <label 
                    htmlFor="cacheSizeBytes" 
                    className="block text-xs font-medium text-ink"
                  >
                    Cuota Máxima de Caché <span className="text-roseState">*</span>
                  </label>
                </div>
                <span className="text-xs font-mono text-forest bg-forest-subtle px-2 py-0.5 rounded border border-forest/30 font-semibold">
                  {formatBytesToMb(formData.cacheSizeBytes)}
                </span>
              </div>

              {/* Presets rápidos */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-muted">Valores rápidos:</span>
                {CACHE_SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.bytes}
                    type="button"
                    onClick={() => handlePresetCache(preset.bytes)}
                    disabled={isSubmitting}
                    className={`px-2 py-0.5 rounded text-xs font-mono border transition-colors ${
                      Number(formData.cacheSizeBytes) === preset.bytes
                        ? 'bg-forest text-white border-forest'
                        : 'bg-surface-subtle text-ink-secondary border-surface-border hover:bg-surface'
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
                className={`w-full px-3 py-2 rounded bg-white border text-ink text-sm font-mono placeholder-ink-muted focus:outline-none transition-colors ${
                  fieldErrors.cacheSizeBytes 
                    ? 'border-roseState focus:border-roseState focus:ring-1 focus:ring-roseState' 
                    : 'border-surface-border focus:border-forest focus:ring-1 focus:ring-forest'
                }`}
              />

              {fieldErrors.cacheSizeBytes ? (
                <p className="text-xs text-roseState mt-1">{fieldErrors.cacheSizeBytes}</p>
              ) : (
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Límite máximo para el dominio. La suma de los tamaños asignados a sus URLs hijas no podrá superarlo.
                </p>
              )}
            </div>

            {/* Botón de Envío */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                id="register-domain-submit"
                className="w-full py-2.5 px-4 rounded bg-forest hover:bg-forest-hover text-white font-medium text-xs sm:text-sm shadow-subtle transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Guardando dominio...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Registrar Dominio</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
