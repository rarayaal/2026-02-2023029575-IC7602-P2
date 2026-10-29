import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import DomainVerificationCard from '../components/DomainVerificationCard';
import { getDomains, deleteDomain } from '../services/domainService';

export default function DomainsListPage() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Estado para el modal de eliminación con confirmación
  const [domainToDelete, setDomainToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Estado para abrir la tarjeta de verificación TXT de un dominio específico
  const [verifyingDomain, setVerifyingDomain] = useState(null);

  const fetchDomains = async () => {
    setLoading(true);
    setApiError(null);

    const res = await getDomains();
    setLoading(false);

    if (res.ok) {
      setDomains(res.data);
    } else {
      setApiError(res.error);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleConfirmDelete = async () => {
    if (!domainToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    const res = await deleteDomain(domainToDelete.name);
    setIsDeleting(false);

    if (res.ok) {
      setDomains((prev) => prev.filter((d) => d.name !== domainToDelete.name));
      setActionSuccess(`El dominio "${domainToDelete.name}" fue eliminado correctamente.`);
      setDomainToDelete(null);
      if (verifyingDomain?.name === domainToDelete.name) {
        setVerifyingDomain(null);
      }
      setTimeout(() => setActionSuccess(null), 5000);
    } else {
      setDeleteError(res.error || 'No se pudo eliminar el dominio.');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 MB';
    const mb = Number(bytes) / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            Mis dominios
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Administre los dominios asociados a las cachés perimetrales y compruebe su propiedad vía DNS TXT.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDomains}
            disabled={loading}
            className="p-2 rounded bg-surface hover:bg-surface-subtle text-ink-secondary hover:text-ink border border-surface-border transition-colors cursor-pointer disabled:opacity-50"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <Link
            to="/dominios/nuevo"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-forest hover:bg-forest-hover text-white text-xs sm:text-sm font-medium shadow-subtle transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Dominio</span>
          </Link>
        </div>
      </div>

      {/* Banner de éxito al realizar operaciones */}
      {actionSuccess && (
        <div className="p-3.5 rounded bg-forest-subtle border border-forest/30 text-forest text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-forest" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-forest hover:opacity-75 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner de error de API si el backend no responde o falla */}
      {apiError && (
        <div className="p-3.5 rounded bg-amberState-subtle border border-amberState-border text-amberState text-xs space-y-1 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium block">Aviso del servidor:</span>
            <p className="text-[11px] leading-relaxed">{apiError}</p>
          </div>
        </div>
      )}

      {/* Sección de Verificación TXT si se seleccionó un dominio */}
      {verifyingDomain && (
        <div className="p-6 rounded-lg bg-surface border border-surface-border shadow-card space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-forest" />
              <h2 className="font-serif text-base font-bold text-ink">
                Verificación DNS TXT: <span className="font-mono text-sm">{verifyingDomain.name}</span>
              </h2>
            </div>
            <button
              onClick={() => setVerifyingDomain(null)}
              className="text-ink-muted hover:text-ink p-1 rounded hover:bg-surface-subtle transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <DomainVerificationCard
            domain={verifyingDomain.name}
            txtRecord={verifyingDomain.txtRecord}
            initialStatus={verifyingDomain.verification?.status || 'pending'}
            verifiedAt={verifyingDomain.verification?.verifiedAt}
            onVerificationChange={({ status, verifiedAt }) => {
              setDomains((prev) =>
                prev.map((d) =>
                  d.name === verifyingDomain.name
                    ? { ...d, verification: { ...d.verification, status, verifiedAt } }
                    : d
                )
              );
            }}
          />
        </div>
      )}

      {/* Lista de Dominios */}
      {loading ? (
        <div className="p-12 text-center bg-surface rounded-lg border border-surface-border space-y-3">
          <div className="w-6 h-6 border-2 border-forest/30 border-t-forest rounded-full animate-spin mx-auto" />
          <p className="text-xs text-ink-muted">Cargando dominios...</p>
        </div>
      ) : domains.length === 0 ? (
        /* Estado vacío */
        <div className="p-10 sm:p-14 text-center bg-surface rounded-lg border border-surface-border shadow-card space-y-4">
          <div className="w-12 h-12 rounded bg-surface-subtle border border-surface-border text-forest flex items-center justify-center mx-auto">
            <Globe className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-serif text-lg font-bold text-ink">No hay dominios registrados</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Agregue su primer dominio para configurar su servidor de origen, tamaño de caché y comprobar la propiedad por DNS TXT.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/dominios/nuevo"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-forest hover:bg-forest-hover text-white text-xs sm:text-sm font-medium shadow-subtle transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Dominio</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Tarjetas de Dominios */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {domains.map((dom) => {
            const isVerified = dom.verification?.status === 'verified';

            return (
              <div 
                key={dom.name}
                className="p-5 rounded-lg bg-surface border border-surface-border shadow-card hover:border-forest/40 flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-3">
                  {/* Encabezado de la tarjeta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-surface-subtle border border-surface-border flex items-center justify-center text-forest">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="font-mono font-semibold text-sm text-ink break-all">
                          {dom.name}
                        </h2>
                      </div>
                    </div>

                    {/* Badge de estado de verificación */}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded border shrink-0 ${
                      isVerified
                        ? 'bg-forest-subtle text-forest border-forest/30'
                        : 'bg-amberState-subtle text-amberState border-amberState-border'
                    }`}>
                      {isVerified ? 'Verificado' : 'Pendiente TXT'}
                    </span>
                  </div>

                  {/* Detalles de origen y caché */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-surface-subtle p-3 rounded border border-surface-border">
                    <div className="space-y-0.5">
                      <span className="text-ink-muted font-sans block text-[11px]">Servidor origen:</span>
                      <span className="text-ink truncate block">
                        {dom.origin ? `${dom.origin.scheme}://${dom.origin.host}:${dom.origin.port}` : 'No definido'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-ink-muted font-sans block text-[11px]">Cuota de caché:</span>
                      <span className="text-forest font-semibold block">
                        {formatBytes(dom.cacheSizeBytes)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones del dominio */}
                <div className="pt-2 border-t border-surface-border flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/dominios/${encodeURIComponent(dom.name)}/urls`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-forest-subtle hover:bg-forest-subtle/80 text-forest border border-forest/30 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Configurar URLs</span>
                    </Link>

                    <button
                      onClick={() => setVerifyingDomain(dom)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-surface hover:bg-surface-subtle text-ink-secondary hover:text-ink text-xs font-medium border border-surface-border transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                      <span>{isVerified ? 'Detalles DNS' : 'Verificar TXT'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setDomainToDelete(dom)}
                    className="p-1.5 rounded text-ink-muted hover:text-roseState hover:bg-roseState-subtle transition-colors cursor-pointer"
                    title="Eliminar dominio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Dominio */}
      {domainToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-lg bg-surface border border-surface-border space-y-4 shadow-card">
            <div className="w-10 h-10 rounded bg-roseState-subtle text-roseState border border-roseState-border flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-ink">¿Eliminar este dominio?</h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Esta acción eliminará el dominio <strong className="text-ink font-mono">{domainToDelete.name}</strong> y todas sus reglas de URL hijas asociadas.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded bg-roseState-subtle border border-roseState-border text-xs text-roseState">
                {deleteError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDomainToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded bg-surface hover:bg-surface-subtle text-ink-secondary hover:text-ink text-xs font-medium border border-surface-border transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-roseState hover:bg-roseState/90 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Eliminando...' : 'Eliminar dominio'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
