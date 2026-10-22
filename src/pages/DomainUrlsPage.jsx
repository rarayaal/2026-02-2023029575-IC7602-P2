import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowLeft, 
  HardDrive, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Code2, 
  Info, 
  AlertTriangle,
  X,
  Lock,
  Key,
  Globe
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { 
  getDomainUrls, 
  createDomainUrl, 
  updateDomainUrl, 
  deleteDomainUrl, 
  validateUrlForm, 
  calculatePatternSpecificity 
} from '../services/urlService';
import { getDomain, normalizeDomain } from '../services/domainService';

// Ejemplos comunes de wildcards según docs/modelo-datos.md línea 103-115
const WILDCARD_EXAMPLES = [
  { pattern: '/*', label: 'Cualquier ruta (catch-all)', desc: 'Coincide con toda petición' },
  { pattern: '/images/*', label: 'Rutas por prefijo', desc: 'Coincide con /images/logo.png, /images/a/b.jpg' },
  { pattern: '/*.css', label: 'Rutas por extensión', desc: 'Coincide con /style.css, /assets/main.css' },
  { pattern: '/api/*', label: 'Prefijo de API', desc: 'Coincide con rutas de servicios internos' },
  { pattern: '/', label: 'Raíz exacta', desc: 'Coincide únicamente con la raíz /' },
];

/**
 * Pantalla de Administración de URLs dentro de un dominio (Tarea T-36).
 * Permite listar, crear, modificar y eliminar URLs con soporte para wildcards (*),
 * cálculo de especificidad y asignación de tipos de autenticación.
 */
export default function DomainUrlsPage() {
  const { domain: rawDomain } = useParams();
  const domainName = normalizeDomain(rawDomain || '');

  const [domainInfo, setDomainInfo] = useState(null);
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Estado para el modal de Crear/Editar URL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState(null); // null = creando, objeto = editando
  const [formData, setFormData] = useState({
    pattern: '',
    cacheSizeBytes: 10485760, // 10 MB por defecto
    authType: 'none',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Estado para el modal de confirmación de eliminación
  const [urlToDelete, setUrlToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Guía de wildcards desplegable
  const [showWildcardGuide, setShowWildcardGuide] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setApiError(null);

    // 1. Obtener detalles del dominio
    const domainRes = await getDomain(domainName);
    if (domainRes.ok && domainRes.data) {
      setDomainInfo(domainRes.data);
    }

    // 2. Obtener lista de URLs del dominio
    const urlsRes = await getDomainUrls(domainName);
    setLoading(false);

    if (urlsRes.ok) {
      // Ordenar por especificidad descendente (más específico primero según docs/modelo-datos.md)
      const sorted = [...urlsRes.data].sort((a, b) => {
        return calculatePatternSpecificity(b.pattern) - calculatePatternSpecificity(a.pattern);
      });
      setUrls(sorted);
    } else {
      setApiError(urlsRes.error);
    }
  };

  useEffect(() => {
    if (domainName) {
      fetchData();
    }
  }, [domainName]);

  const handleOpenCreateModal = () => {
    setEditingUrl(null);
    setFormData({
      pattern: '',
      cacheSizeBytes: 10485760, // 10 MB
      authType: 'none',
    });
    setFormErrors({});
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (urlItem) => {
    setEditingUrl(urlItem);
    setFormData({
      pattern: urlItem.pattern,
      cacheSizeBytes: urlItem.cacheSizeBytes,
      authType: urlItem.auth?.type || 'none',
    });
    setFormErrors({});
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    // Validación del formulario con reglas de wildcards
    const validation = validateUrlForm(formData);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    if (editingUrl) {
      // Modificar URL existente
      const res = await updateDomainUrl(domainName, editingUrl.id, formData);
      setIsSubmitting(false);

      if (res.ok) {
        setUrls((prev) =>
          prev.map((u) => (u.id === editingUrl.id ? { ...u, ...formData, auth: { type: formData.authType } } : u))
        );
        setActionSuccess(`La URL con patrón "${formData.pattern}" fue modificada correctamente.`);
        setIsModalOpen(false);
        setTimeout(() => setActionSuccess(null), 5000);
      } else {
        setModalError(res.error || 'No se pudo actualizar la URL.');
      }
    } else {
      // Crear nueva URL
      const res = await createDomainUrl(domainName, formData);
      setIsSubmitting(false);

      if (res.ok) {
        const returnedData = res.data && typeof res.data === 'object' ? res.data : {};
        const newUrl = {
          id: returnedData.id || `u_${Date.now()}`,
          pattern: returnedData.pattern || formData.pattern,
          cacheSizeBytes: Number(returnedData.cacheSizeBytes || formData.cacheSizeBytes),
          auth: returnedData.auth || { type: formData.authType },
          createdAt: returnedData.createdAt || new Date().toISOString(),
          ...returnedData,
        };


        setUrls((prev) => {
          const updated = [...prev, newUrl];
          return updated.sort((a, b) => calculatePatternSpecificity(b.pattern) - calculatePatternSpecificity(a.pattern));
        });

        setActionSuccess(`La URL con patrón "${formData.pattern}" fue creada exitosamente.`);
        setIsModalOpen(false);
        setTimeout(() => setActionSuccess(null), 5000);
      } else {
        setModalError(res.error || 'No se pudo crear la URL.');
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!urlToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    const res = await deleteDomainUrl(domainName, urlToDelete.id);
    setIsDeleting(false);

    if (res.ok) {
      setUrls((prev) => prev.filter((u) => u.id !== urlToDelete.id));
      setActionSuccess(`La URL con patrón "${urlToDelete.pattern}" fue eliminada del dominio.`);
      setUrlToDelete(null);
      setTimeout(() => setActionSuccess(null), 5000);
    } else {
      setDeleteError(res.error || 'No se pudo eliminar la URL.');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 MB';
    const mb = Number(bytes) / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const totalAllocatedBytes = urls.reduce((acc, curr) => acc + (Number(curr.cacheSizeBytes) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Navegación y Encabezado de la Tarea T-36 */}
      <div className="space-y-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Link
            to="/dominios"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a Dominios</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-mono text-slate-300">{domainName}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <StatusBadge label="Tarea T-36: Administración de URLs" status="info" />
              <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                Soporte Wildcards (*)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span className="font-mono text-indigo-300">{domainName}</span>
              <span className="text-slate-500 font-sans text-lg font-normal">— URLs y Rutas</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure los patrones de URL admitidos, políticas de autenticación y partición del tamaño de caché del dominio.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Refrescar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreateModal}
              id="create-url-button"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva URL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjeta de métricas del dominio (Capacidad asignada vs total) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>Dominio contenedor:</span>
          </span>
          <span className="text-base font-bold text-white font-mono">{domainName}</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>URLs configuradas:</span>
          </span>
          <span className="text-base font-bold text-indigo-300 font-mono">
            {urls.length} {urls.length === 1 ? 'patrón' : 'patrones'}
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>Caché asignada a URLs:</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-emerald-300 font-mono">
              {formatBytes(totalAllocatedBytes)}
            </span>
            {domainInfo?.cacheSizeBytes && (
              <span className="text-xs text-slate-500 font-mono">
                / {formatBytes(domainInfo.cacheSizeBytes)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Banner de éxito */}
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

      {/* Banner de error de API si no responde el backend */}
      {apiError && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs sm:text-sm space-y-1.5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-white">Estado de conexión con el backend:</span>
            <p className="text-amber-200/90 text-xs leading-relaxed">{apiError}</p>
          </div>
        </div>
      )}

      {/* Panel explicativo de las reglas de Wildcards (Acordeón) */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowWildcardGuide(!showWildcardGuide)}
          className="w-full px-5 py-3.5 text-left text-xs sm:text-sm font-semibold text-slate-300 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <span>Reglas de Comodines (Wildcards) y Especificidad (docs/modelo-datos.md)</span>
          </div>
          <span className="text-xs font-mono text-indigo-400">{showWildcardGuide ? 'Ocultar' : 'Ver reglas'}</span>
        </button>

        {showWildcardGuide && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-3 text-xs leading-relaxed text-slate-400">
            <p>
              El comodín <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded font-mono font-bold">*</code> coincide con cualquier secuencia de caracteres, incluida la vacía y barras inclinadas (<code className="text-slate-300 font-mono">/</code>).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-900/90 text-slate-300 font-sans">
                  <tr>
                    <th className="p-2 border-b border-slate-800">Patrón</th>
                    <th className="p-2 border-b border-slate-800">Coincide con</th>
                    <th className="p-2 border-b border-slate-800">No coincide con</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  <tr>
                    <td className="p-2 text-sky-300 font-bold">/</td>
                    <td className="p-2 text-emerald-300">/</td>
                    <td className="p-2 text-rose-300">/index.html</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-sky-300 font-bold">/images/*</td>
                    <td className="p-2 text-emerald-300">/images/logo.png, /images/a/b.jpg</td>
                    <td className="p-2 text-rose-300">/img/logo.png</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-sky-300 font-bold">/*.css</td>
                    <td className="p-2 text-emerald-300">/style.css, /assets/main.css</td>
                    <td className="p-2 text-rose-300">/style.css.map</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-sky-300 font-bold">/*</td>
                    <td className="p-2 text-emerald-300">cualquier ruta</td>
                    <td className="p-2 text-slate-500">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px]">
              <strong>Regla de desempate:</strong> Si una ruta coincide con varios patrones, gana el <strong>más específico</strong> (el que tiene más caracteres literales sin contar <code className="text-indigo-300 font-mono">*</code>).
            </p>
          </div>
        )}
      </div>

      {/* Lista de URLs del Dominio */}
      {loading ? (
        <div className="p-12 text-center glass-panel rounded-3xl border border-slate-800 space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Consultando URLs del dominio...</p>
        </div>
      ) : urls.length === 0 ? (
        /* Estado vacío */
        <div className="p-10 sm:p-14 text-center glass-panel rounded-3xl border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Layers className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-white">No hay URLs configuradas en este dominio</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Cree un patrón de ruta (por ejemplo <code className="text-indigo-300 font-mono">/*</code> para atender todo el dominio o <code className="text-sky-300 font-mono">/images/*</code> para archivos estáticos) para que la caché zonal comience a cachear.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primera URL</span>
            </button>
          </div>
        </div>
      ) : (
        /* Tabla/Tarjetas de URLs ordenadas por especificidad */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Listado ordenado por especificidad (la primera coincidencia atiende la petición):</span>
            <span className="font-mono">{urls.length} URLs</span>
          </div>

          <div className="divide-y divide-slate-800/80 rounded-2xl glass-panel border border-slate-800 overflow-hidden">
            {urls.map((urlItem, idx) => {
              const specificity = calculatePatternSpecificity(urlItem.pattern);
              const authType = urlItem.auth?.type || 'none';

              return (
                <div 
                  key={urlItem.id || urlItem.pattern}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-mono text-slate-500 shrink-0 mt-0.5">
                      #{idx + 1}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-base text-white bg-slate-950/80 px-2.5 py-0.5 rounded-lg border border-slate-800">
                          {urlItem.pattern}
                        </span>

                        {/* Badge de especificidad */}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                          Especificidad: {specificity} caracteres
                        </span>

                        {/* Badge de autenticación */}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          authType === 'none'
                            ? 'bg-slate-900 text-slate-400 border-slate-800'
                            : authType === 'api_key'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                            : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                        }`}>
                          {authType === 'none' && <span>Pública (sin auth)</span>}
                          {authType === 'api_key' && (
                            <>
                              <Key className="w-3 h-3" />
                              <span>x-api-key</span>
                            </>
                          )}
                          {authType === 'user_password' && (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Usuario / Clave</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                        <span>Caché asignada: <strong className="text-emerald-300">{formatBytes(urlItem.cacheSizeBytes)}</strong></span>
                        {urlItem.id && <span className="text-slate-600">• ID: {urlItem.id}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Acciones de la URL */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleOpenEditModal(urlItem)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
                      title="Editar URL"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => setUrlToDelete(urlItem)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-colors cursor-pointer"
                      title="Eliminar URL"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Crear / Editar URL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-6 rounded-3xl glass-panel border border-slate-800 bg-surface-dark space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  {editingUrl ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingUrl ? 'Modificar URL' : 'Nueva URL para el Dominio'}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">{domainName}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error en el modal */}
            {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4" noValidate>
              
              {/* Campo: Patrón de URL */}
              <div className="space-y-1.5">
                <label htmlFor="pattern" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Patrón de Ruta (con Wildcards) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="pattern"
                  name="pattern"
                  value={formData.pattern}
                  onChange={(e) => {
                    setFormData({ ...formData, pattern: e.target.value });
                    if (formErrors.pattern) setFormErrors({ ...formErrors, pattern: null });
                  }}
                  disabled={isSubmitting}
                  placeholder="/* o /images/* o /*.css"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-slate-100 text-sm font-mono placeholder-slate-500 focus:outline-none transition-all ${
                    formErrors.pattern 
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' 
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
                {formErrors.pattern && (
                  <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{formErrors.pattern}</span>
                  </p>
                )}

                {/* Accesos rápidos de patrones */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">Insertar ejemplo:</span>
                  {WILDCARD_EXAMPLES.map((ex) => (
                    <button
                      key={ex.pattern}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, pattern: ex.pattern });
                        if (formErrors.pattern) setFormErrors({ ...formErrors, pattern: null });
                      }}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[10px] font-mono transition-colors"
                      title={ex.desc}
                    >
                      {ex.pattern}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo: Tamaño de Caché (bytes) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="cacheSizeBytes" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Tamaño de Caché (bytes) <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-xs font-mono text-emerald-300">
                    {formatBytes(formData.cacheSizeBytes)}
                  </span>
                </div>
                <input
                  type="number"
                  id="cacheSizeBytes"
                  name="cacheSizeBytes"
                  min="1048576"
                  step="1048576"
                  value={formData.cacheSizeBytes}
                  onChange={(e) => {
                    setFormData({ ...formData, cacheSizeBytes: e.target.value });
                    if (formErrors.cacheSizeBytes) setFormErrors({ ...formErrors, cacheSizeBytes: null });
                  }}
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-slate-100 text-sm font-mono placeholder-slate-500 focus:outline-none transition-all ${
                    formErrors.cacheSizeBytes 
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' 
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
                {formErrors.cacheSizeBytes && (
                  <p className="text-xs text-rose-400 mt-1">{formErrors.cacheSizeBytes}</p>
                )}
              </div>

              {/* Campo: Tipo de Autenticación */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Mecanismo de Autenticación (docs/modelo-datos.md) <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                    formData.authType === 'none'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}>
                    <div className="flex items-center gap-2 font-semibold">
                      <input
                        type="radio"
                        name="authType"
                        value="none"
                        checked={formData.authType === 'none'}
                        onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                        className="accent-indigo-500"
                      />
                      <span>Pública (none)</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Sin credenciales requeridas</span>
                  </label>

                  <label className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                    formData.authType === 'api_key'
                      ? 'bg-amber-600/20 border-amber-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}>
                    <div className="flex items-center gap-2 font-semibold">
                      <input
                        type="radio"
                        name="authType"
                        value="api_key"
                        checked={formData.authType === 'api_key'}
                        onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                        className="accent-amber-500"
                      />
                      <span>API Key</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Encabezado x-api-key</span>
                  </label>

                  <label className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                    formData.authType === 'user_password'
                      ? 'bg-purple-600/20 border-purple-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}>
                    <div className="flex items-center gap-2 font-semibold">
                      <input
                        type="radio"
                        name="authType"
                        value="user_password"
                        checked={formData.authType === 'user_password'}
                        onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                        className="accent-purple-500"
                      />
                      <span>Usuario/Clave</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Cookie zc_session</span>
                  </label>
                </div>
              </div>

              {/* Botones de acción del Modal */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingUrl ? 'Guardar Cambios' : 'Crear URL'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar URL */}
      {urlToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl glass-panel border border-rose-900/60 bg-surface-dark space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">¿Eliminar esta URL?</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Esta acción eliminará el patrón <strong className="text-white font-mono">{urlToDelete.pattern}</strong> del dominio <strong className="text-white font-mono">{domainName}</strong>. Las peticiones a esta ruta ya no serán cacheadas por la caché zonal.
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
                onClick={() => setUrlToDelete(null)}
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
                <span>{isDeleting ? 'Eliminando...' : 'Sí, eliminar URL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
