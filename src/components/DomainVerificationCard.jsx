import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  Info,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { getDnsTxtSpec, requestDomainTxtVerification } from '../services/domainService';

/**
 * Componente interactivo para mostrar y gestionar la verificación de propiedad
 * de un dominio mediante registro DNS TXT (_proxycache-verify.<domain>).
 * Basado en docs/modelo-datos.md (T-34).
 */
export default function DomainVerificationCard({ 
  domain, 
  verificationToken, 
  initialStatus = 'pending',
  verifiedAt = null,
  onVerificationChange = null 
}) {
  const [copiedField, setCopiedField] = useState(null);
  const [status, setStatus] = useState(initialStatus);
  const [timestamp, setTimestamp] = useState(verifiedAt);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const dnsSpec = getDnsTxtSpec(domain, verificationToken || 'TOKEN_PENDIENTE');

  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (err) {
      console.warn('No se pudo copiar automáticamente:', err);
    }
  };

  const handleVerify = async () => {
    setChecking(true);
    setCheckResult(null);

    const res = await requestDomainTxtVerification(domain);
    setChecking(false);

    if (res.ok && res.verified) {
      setStatus('verified');
      const now = new Date().toISOString();
      setTimestamp(now);
      setCheckResult({
        success: true,
        message: '¡Verificación exitosa! La propiedad del dominio ha sido comprobada mediante el registro DNS TXT.',
      });
      if (onVerificationChange) onVerificationChange({ status: 'verified', verifiedAt: now });
    } else if (res.ok && !res.verified) {
      setStatus('pending');
      setCheckResult({
        success: false,
        isPendingPropagation: true,
        message: 'No se encontró el registro TXT o el valor aún no coincide. Los cambios de DNS pueden tardar algunos minutos en propagarse. Intente nuevamente en breve.',
      });
    } else {
      setCheckResult({
        success: false,
        isApiError: true,
        message: res.error || 'No fue posible consultar el servicio de verificación.',
        code: res.code,
      });
    }
  };

  const isVerified = status === 'verified';

  return (
    <div className={`p-6 rounded-2xl glass-panel border transition-all ${
      isVerified ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-800'
    }`}>
      {/* Encabezado del estado de verificación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isVerified 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          }`}>
            {isVerified ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base font-mono">{domain}</h3>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                isVerified 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
              }`}>
                {isVerified ? 'Dominio Verificado' : 'Verificación TXT Pendiente'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isVerified 
                ? `Propiedad validada el ${timestamp ? new Date(timestamp).toLocaleString() : 'recientemente'}`
                : 'Se requiere validar la propiedad mediante registro DNS antes de su activación en el proxy'}
            </p>
          </div>
        </div>

        {/* Botón de acción para verificar */}
        {!isVerified && (
          <button
            onClick={handleVerify}
            disabled={checking}
            id="verify-domain-button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Comprobando DNS...' : 'Comprobar Verificación TXT'}</span>
          </button>
        )}
      </div>

      {/* Resultado de la comprobación */}
      {checkResult && (
        <div className={`mt-4 p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
          checkResult.success 
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' 
            : checkResult.isPendingPropagation
            ? 'bg-amber-950/60 border-amber-800 text-amber-200'
            : 'bg-rose-950/60 border-rose-800 text-rose-200'
        }`}>
          {checkResult.success ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div>
            <strong>{checkResult.success ? 'Confirmado: ' : 'Aviso: '}</strong>
            {checkResult.message}
          </div>
        </div>
      )}

      {/* Bloque con las instrucciones del registro DNS TXT si aún está pendiente */}
      {!isVerified && (
        <div className="mt-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-slate-200 block">Instrucciones de configuración DNS:</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Acceda al panel de control de su proveedor DNS (ej. Cloudflare, Route 53, GoDaddy) y agregue el siguiente registro TXT en la zona del dominio. El Zonal Cache y el DNS Interceptor únicamente interceptarán dominios verificados.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            {/* Host / Nombre */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
                <span>Nombre del Host (Host / Name):</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(dnsSpec.recordHost, 'host')}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                  title="Copiar nombre de host"
                >
                  {copiedField === 'host' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-sky-300 font-semibold break-all text-[11px]">
                {dnsSpec.recordHost}
              </span>
            </div>

            {/* Tipo */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between gap-1">
              <span className="text-[11px] font-sans text-slate-400">Tipo de Registro:</span>
              <span className="text-emerald-400 font-bold text-sm">
                TXT
              </span>
            </div>

            {/* Valor esperado */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
                <span>Valor del Registro (TXT Value):</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(dnsSpec.recordValue, 'value')}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                  title="Copiar valor TXT"
                >
                  {copiedField === 'value' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-amber-300 font-semibold break-all text-[11px]">
                {dnsSpec.recordValue}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-sans pt-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Nota técnica: La validación sintáctica del nombre no otorga propiedad. El backend consulta el registro DNS en tiempo real.</span>
          </div>
        </div>
      )}
    </div>
  );
}
