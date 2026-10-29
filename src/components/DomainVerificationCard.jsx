import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Copy, 
  Check, 
  RefreshCw, 
  Info,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { getDnsTxtSpec, requestDomainTxtVerification } from '../services/domainService';

/**
 * Componente para mostrar y gestionar la verificación de propiedad
 * de un dominio mediante registro DNS TXT (_proxycache-verify.<domain>).
 */
export default function DomainVerificationCard({ 
  domain, 
  verificationToken = null, 
  txtRecord = null,
  initialStatus = 'pending',
  verifiedAt = null,
  onVerificationChange = null 
}) {
  const [copiedField, setCopiedField] = useState(null);
  const [status, setStatus] = useState(initialStatus);
  const [timestamp, setTimestamp] = useState(verifiedAt);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const dnsSpec = txtRecord
    ? {
        recordHost: txtRecord.name || txtRecord.recordHost || `_proxycache-verify.${domain}`,
        recordType: txtRecord.type || txtRecord.recordType || 'TXT',
        recordValue: txtRecord.value || txtRecord.recordValue || (verificationToken ? `proxycache-verification=${verificationToken}` : ''),
      }
    : getDnsTxtSpec(domain, verificationToken || '');

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
        message: 'Verificación exitosa. La propiedad del dominio ha sido comprobada mediante el registro DNS TXT.',
      });
      if (onVerificationChange) onVerificationChange({ status: 'verified', verifiedAt: now });
    } else if (res.ok && !res.verified) {
      setStatus('pending');
      setCheckResult({
        success: false,
        isPendingPropagation: true,
        message: 'No se encontró el registro TXT o el valor aún no coincide. Los cambios en el DNS pueden tardar varios minutos en propagarse.',
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
    <div className={`p-6 rounded-lg border transition-all ${
      isVerified 
        ? 'border-forest/30 bg-forest-subtle/50' 
        : 'border-surface-border bg-surface shadow-card'
    }`}>
      {/* Encabezado del estado de verificación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${
            isVerified 
              ? 'bg-forest-subtle text-forest border border-forest/30' 
              : 'bg-amberState-subtle text-amberState border border-amberState-border'
          }`}>
            {isVerified ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-semibold text-ink">{domain}</h3>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                isVerified 
                  ? 'bg-forest-subtle text-forest border-forest/30'
                  : 'bg-amberState-subtle text-amberState border-amberState-border'
              }`}>
                {isVerified ? 'Dominio verificado' : 'Verificación TXT pendiente'}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              {isVerified 
                ? `Propiedad validada el ${timestamp ? new Date(timestamp).toLocaleString() : 'recientemente'}`
                : 'Se requiere validar la propiedad mediante registro DNS antes de su activación'}
            </p>
          </div>
        </div>

        {/* Botón de acción para verificar */}
        {!isVerified && (
          <button
            onClick={handleVerify}
            disabled={checking}
            id="verify-domain-button"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded bg-forest hover:bg-forest-hover text-white text-xs font-medium transition-colors shadow-subtle disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Comprobando DNS...' : 'Comprobar registro TXT'}</span>
          </button>
        )}
      </div>

      {/* Resultado de la comprobación */}
      {checkResult && (
        <div className={`mt-4 p-3.5 rounded border text-xs leading-relaxed flex items-start gap-2.5 ${
          checkResult.success 
            ? 'bg-forest-subtle border-forest/30 text-forest' 
            : checkResult.isPendingPropagation
            ? 'bg-amberState-subtle border-amberState-border text-amberState'
            : 'bg-roseState-subtle border-roseState-border text-roseState'
        }`}>
          {checkResult.success ? (
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-forest" />
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
          <div className="p-3.5 rounded bg-surface-subtle border border-surface-border text-xs text-ink-secondary flex items-start gap-2.5">
            <Info className="w-4 h-4 text-forest shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-ink block">Instrucciones de configuración DNS:</span>
              <p className="text-ink-secondary text-[11px] leading-relaxed">
                Acceda al panel de su proveedor DNS y agregue el siguiente registro TXT en la zona del dominio. El sistema validará este valor antes de habilitar la caché perimetral.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            {/* Host / Nombre */}
            <div className="p-3 rounded bg-surface-subtle border border-surface-border flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between text-[11px] font-sans text-ink-muted">
                <span>Nombre del Host:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(dnsSpec.recordHost, 'host')}
                  className="text-ink-muted hover:text-ink p-1 rounded hover:bg-surface transition-colors"
                  title="Copiar nombre de host"
                >
                  {copiedField === 'host' ? <Check className="w-3.5 h-3.5 text-forest" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-ink font-semibold break-all text-[11px]">
                {dnsSpec.recordHost}
              </span>
            </div>

            {/* Tipo */}
            <div className="p-3 rounded bg-surface-subtle border border-surface-border flex flex-col justify-between gap-1">
              <span className="text-[11px] font-sans text-ink-muted">Tipo de Registro:</span>
              <span className="text-forest font-bold text-sm">
                TXT
              </span>
            </div>

            {/* Valor esperado */}
            <div className="p-3 rounded bg-surface-subtle border border-surface-border flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between text-[11px] font-sans text-ink-muted">
                <span>Valor del Registro:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(dnsSpec.recordValue, 'value')}
                  className="text-ink-muted hover:text-ink p-1 rounded hover:bg-surface transition-colors"
                  title="Copiar valor TXT"
                >
                  {copiedField === 'value' ? <Check className="w-3.5 h-3.5 text-forest" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-ink font-semibold break-all text-[11px]">
                {dnsSpec.recordValue}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted font-sans pt-1">
            <Clock className="w-3.5 h-3.5 text-ink-muted" />
            <span>Nota: La validación de propiedad requiere que el registro DNS esté disponible públicamente.</span>
          </div>
        </div>
      )}
    </div>
  );
}
