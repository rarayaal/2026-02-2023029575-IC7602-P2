import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink, 
  ArrowRight, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  HardDrive, 
  Server,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import DomainVerificationCard from '../components/DomainVerificationCard';
import { getDomains, deleteDomain, normalizeDomain } from '../services/domainService';

/**
 * Pantalla de Administración de Dominios (Tarea T-35).
 * Permite listar dominios, agregar nuevos, eliminarlos con confirmación
 * y verificar la propiedad mediante registro DNS TXT.
 */
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
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Encabezado y Metadatos de la Tarea T-35 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge label="Tarea T-35: Administración de Dominios" status="info" />
            <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
              Colección: domains/{'{domain}'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dominios Registrados
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Administre los dominios asociados a las cachés zonales, verifique su propiedad mediante DNS TXT y gestione sus URLs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDomains}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <Link
            to="/dominios/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Dominio</span>
          </Link>
        </div>
      </div>

      {/* Banner de éxito al realizar operaciones */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner de error de API si el backend no responde o falla */}
      {apiError && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs sm:text-sm space-y-1.5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-white">Estado de conexión con el backend:</span>
            <p className="text-amber-200/90 text-xs leading-relaxed">{apiError}</p>
          </div>
        </div>
      )}

      {/* Modal / Sección de Verificación TXT si se seleccionó un dominio */}
      {verifyingDomain && (
        <div className="p-6 rounded-3xl glass-panel border border-indigo-500/40 bg-indigo-950/10 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-900/50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">
                Comprobación de Verificación DNS TXT para <span className="font-mono text-indigo-300">{verifyingDomain.name}</span>
              </h2>
            </div>
            <button
              onClick={() => setVerifyingDomain(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <DomainVerificationCard
            domain={verifyingDomain.name}
            verificationToken={verifyingDomain.verification?.token || 'TOKEN_PENDIENTE'}
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
        <div className="p-12 text-center glass-panel rounded-3xl border border-slate-800 space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Consultando dominios registrados...</p>
        </div>
      ) : domains.length === 0 ? (
        /* Estado vacío */
        <div className="p-10 sm:p-14 text-center glass-panel rounded-3xl border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Globe className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-white">No hay dominios registrados</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Agregue su primer dominio para configurar su servidor de origen, tamaño de caché y validar la propiedad por DNS TXT.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/dominios/nuevo"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Primer Dominio</span>
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
                className="p-5 rounded-2xl glass-card border border-slate-800 hover:border-slate-700 flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-3">
                  {/* Encabezado de la tarjeta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-white font-mono break-all">
                          {dom.name}
                        </h2>
                        <span className="text-[11px] text-slate-500 font-mono">
                          ID: {dom.name}
                        </span>
                      </div>
                    </div>

                    {/* Badge de estado de verificación */}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                      isVerified
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                        : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                    }`}>
                      {isVerified ? 'Verificado' : 'Pendiente TXT'}
                    </span>
                  </div>

                  {/* Detalles técnicos del origen y caché */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="space-y-0.5">
                      <span className="text-slate-500 font-sans block text-[10px]">Origen configurado:</span>
                      <span className="text-slate-200 truncate block">
                        {dom.origin ? `${dom.origin.scheme}://${dom.origin.host}:${dom.origin.port}` : 'No definido'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-500 font-sans block text-[10px]">Caché Máxima:</span>
                      <span className="text-indigo-300 font-semibold block">
                        {formatBytes(dom.cacheSizeBytes)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones del dominio */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Botón Administrar URLs */}
                    <Link
                      to={`/dominios/${encodeURIComponent(dom.name)}/urls`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Administrar URLs (T-36)</span>
                    </Link>

                    {/* Botón Verificación TXT */}
                    <button
                      onClick={() => setVerifyingDomain(dom)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
                      title="Verificar registro DNS TXT"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>{isVerified ? 'Detalles DNS' : 'Verificar TXT'}</span>
                    </button>
                  </div>

                  {/* Botón Eliminar Dominio */}
                  <button
                    onClick={() => setDomainToDelete(dom)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl glass-panel border border-rose-900/60 bg-surface-dark space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">¿Eliminar este dominio?</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Esta acción eliminará el dominio <strong className="text-white font-mono">{domainToDelete.name}</strong> y todas sus URLs y configuraciones de caché hijas. La caché zonal dejará de atender peticiones para este host.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200">
                {deleteError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDomainToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Eliminando...' : 'Sí, eliminar dominio'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
