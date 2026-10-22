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
  Globe,
  Sliders,
  Clock,
  Users,
  Copy,
  Check,
  Eye,
  EyeOff,
  UserPlus,
  FileCode
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import {
  getDomainUrls,
  createDomainUrl,
  updateDomainUrl,
  deleteDomainUrl,
  validateUrlForm,
  calculatePatternSpecificity,
  ALLOWED_CACHE_POLICIES,
  CACHE_POLICY_DETAILS,
  COMMON_FILE_TYPES,
  validateFileTypeEntry
} from '../services/urlService';
import {
  getDomainUrlApiKeys,
  createDomainUrlApiKey,
  deleteDomainUrlApiKey,
  getDomainUrlUsers,
  createDomainUrlUser,
  updateDomainUrlUserPassword,
  deleteDomainUrlUser
} from '../services/urlAuthService';
import { getDomain, normalizeDomain } from '../services/domainService';

// Ejemplos comunes de wildcards según docs/modelo-datos.md líneas 103-115
const WILDCARD_EXAMPLES = [
  { pattern: '/*', label: 'Cualquier ruta (catch-all)', desc: 'Coincide con toda petición' },
  { pattern: '/images/*', label: 'Rutas por prefijo', desc: 'Coincide con /images/logo.png, /images/a/b.jpg' },
  { pattern: '/*.css', label: 'Rutas por extensión', desc: 'Coincide con /style.css, /assets/main.css' },
  { pattern: '/api/*', label: 'Prefijo de API', desc: 'Coincide con rutas de servicios internos' },
  { pattern: '/', label: 'Raíz exacta', desc: 'Coincide únicamente con la raíz /' },
];

/**
 * Pantalla de Administración de URLs y Políticas de Caché y Autenticación (T-36, T-37, T-38).
 * Permite listar, crear, modificar y eliminar URLs con wildcards, configurar TTL y políticas de reemplazo
 * por tipo de archivo (fileTypes), y administrar API keys y usuarios autorizados.
 */
export default function DomainUrlsPage() {
  const { domain: rawDomain } = useParams();
  const domainName = normalizeDomain(rawDomain || '');

  const [domainInfo, setDomainInfo] = useState(null);
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Estado para el modal de Crear/Editar URL (T-36 y T-37)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState(null); // null = creando, objeto = editando
  const [formData, setFormData] = useState({
    pattern: '',
    cacheSizeBytes: 10485760, // 10 MB por defecto
    authType: 'none',
    fileTypes: {},
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Sub-formulario para agregar/editar una extensión en fileTypes (T-37)
  const [newFileType, setNewFileType] = useState({
    ext: '',
    ttlSeconds: 300,
    policy: 'LRU',
  });
  const [fileTypeError, setFileTypeError] = useState(null);

  // Estado para el modal de confirmación de eliminación de URL
  const [urlToDelete, setUrlToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Guía de wildcards desplegable
  const [showWildcardGuide, setShowWildcardGuide] = useState(false);

  // =========================================================================
  // Estados para T-38: Administración de Credenciales por URL
  // =========================================================================

  // Modal de API Keys (auth.type === 'api_key')
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState(false);
  const [activeAuthUrl, setActiveAuthUrl] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [apiKeysError, setApiKeysError] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyFormError, setNewKeyFormError] = useState(null);
  const [createdRawKey, setCreatedRawKey] = useState(null); // Clave mostrada una sola vez
  const [copiedKey, setCopiedKey] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState(null);
  const [isDeletingKey, setIsDeletingKey] = useState(false);

  // Modal de Usuarios y Contraseñas (auth.type === 'user_password')
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [urlUsers, setUrlUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserFormError, setNewUserFormError] = useState(null);

  // Sub-modal cambiar contraseña
  const [userToChangePass, setUserToChangePass] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showChangePass, setShowChangePass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [changePassError, setChangePassError] = useState(null);

  // Sub-modal eliminar usuario
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

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

  // =========================================================================
  // Manejadores de URL Modal (T-36 y T-37)
  // =========================================================================

  const handleOpenCreateModal = () => {
    setEditingUrl(null);
    setFormData({
      pattern: '',
      cacheSizeBytes: 10485760, // 10 MB
      authType: 'none',
      fileTypes: {
        html: { ttlSeconds: 60, policy: 'LRU' },
        css: { ttlSeconds: 3600, policy: 'LFU' },
        js: { ttlSeconds: 3600, policy: 'LFU' },
        png: { ttlSeconds: 86400, policy: 'FIFO' },
        '*': { ttlSeconds: 300, policy: 'RANDOM' },
      },
    });
    setNewFileType({ ext: '', ttlSeconds: 300, policy: 'LRU' });
    setFileTypeError(null);
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
      fileTypes: urlItem.fileTypes && typeof urlItem.fileTypes === 'object' ? { ...urlItem.fileTypes } : {},
    });
    setNewFileType({ ext: '', ttlSeconds: 300, policy: 'LRU' });
    setFileTypeError(null);
    setFormErrors({});
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleAddOrUpdateFileType = (e) => {
    e.preventDefault();
    setFileTypeError(null);

    const validation = validateFileTypeEntry(newFileType.ext, {
      ttlSeconds: newFileType.ttlSeconds,
      policy: newFileType.policy,
    });

    if (!validation.valid) {
      setFileTypeError(validation.error);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      fileTypes: {
        ...prev.fileTypes,
        [validation.cleanExt]: validation.config,
      },
    }));

    setNewFileType({ ext: '', ttlSeconds: 300, policy: 'LRU' });
  };

  const handleRemoveFileType = (extKey) => {
    setFormData((prev) => {
      const next = { ...prev.fileTypes };
      delete next[extKey];
      return { ...prev, fileTypes: next };
    });
  };

  const handleApplyPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      fileTypes: {
        ...prev.fileTypes,
        [preset.ext]: { ttlSeconds: preset.defaultTtl, policy: preset.defaultPolicy },
      },
    }));
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    // Validación del formulario con reglas de wildcards y fileTypes
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
          prev.map((u) =>
            u.id === editingUrl.id
              ? {
                  ...u,
                  ...formData,
                  auth: { type: formData.authType },
                  fileTypes: { ...formData.fileTypes },
                }
              : u
          )
        );
        setActionSuccess(`La URL con patrón "${formData.pattern}" y sus políticas de caché fueron modificadas correctamente.`);
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
          fileTypes: returnedData.fileTypes || { ...formData.fileTypes },
          createdAt: returnedData.createdAt || new Date().toISOString(),
          ...returnedData,
        };

        setUrls((prev) => {
          const updated = [...prev, newUrl];
          return updated.sort((a, b) => calculatePatternSpecificity(b.pattern) - calculatePatternSpecificity(a.pattern));
        });

        setActionSuccess(`La URL con patrón "${formData.pattern}" y sus políticas de caché fueron creadas exitosamente.`);
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

  // =========================================================================
  // Manejadores de T-38: API Keys (auth.type === 'api_key')
  // =========================================================================

  const handleOpenApiKeysModal = async (urlItem) => {
    setActiveAuthUrl(urlItem);
    setNewKeyName('');
    setNewKeyFormError(null);
    setCreatedRawKey(null);
    setCopiedKey(false);
    setKeyToDelete(null);
    setIsApiKeysModalOpen(true);
    setLoadingApiKeys(true);
    setApiKeysError(null);

    const res = await getDomainUrlApiKeys(domainName, urlItem.id);
    setLoadingApiKeys(false);

    if (res.ok) {
      setApiKeys(res.data);
    } else {
      setApiKeysError(res.error);
    }
  };

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    if (!activeAuthUrl) return;

    setNewKeyFormError(null);
    setIsCreatingKey(true);

    const res = await createDomainUrlApiKey(domainName, activeAuthUrl.id, newKeyName);
    setIsCreatingKey(false);

    if (res.ok) {
      setApiKeys((prev) => [res.data, ...prev]);
      setCreatedRawKey(res.rawKey);
      setNewKeyName('');
    } else {
      setNewKeyFormError(res.error || 'No se pudo generar la API key.');
    }
  };

  const handleDeleteApiKey = async () => {
    if (!activeAuthUrl || !keyToDelete) return;

    setIsDeletingKey(true);
    const res = await deleteDomainUrlApiKey(domainName, activeAuthUrl.id, keyToDelete.id);
    setIsDeletingKey(false);

    if (res.ok) {
      setApiKeys((prev) => prev.filter((k) => k.id !== keyToDelete.id));
      setKeyToDelete(null);
    } else {
      alert(res.error || 'No se pudo eliminar la API key.');
    }
  };

  const handleCopyRawKey = () => {
    if (!createdRawKey) return;
    navigator.clipboard.writeText(createdRawKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  // =========================================================================
  // Manejadores de T-38: Usuarios y Contraseñas (auth.type === 'user_password')
  // =========================================================================

  const handleOpenUrlUsersModal = async (urlItem) => {
    setActiveAuthUrl(urlItem);
    setNewUsername('');
    setNewUserPassword('');
    setShowNewUserPassword(false);
    setNewUserFormError(null);
    setUserToChangePass(null);
    setNewPasswordInput('');
    setUserToDelete(null);
    setIsUsersModalOpen(true);
    setLoadingUsers(true);
    setUsersError(null);

    const res = await getDomainUrlUsers(domainName, urlItem.id);
    setLoadingUsers(false);

    if (res.ok) {
      setUrlUsers(res.data);
    } else {
      setUsersError(res.error);
    }
  };

  const handleCreateUrlUser = async (e) => {
    e.preventDefault();
    if (!activeAuthUrl) return;

    setNewUserFormError(null);
    setIsCreatingUser(true);

    const res = await createDomainUrlUser(domainName, activeAuthUrl.id, newUsername, newUserPassword);
    setIsCreatingUser(false);

    if (res.ok) {
      setUrlUsers((prev) => [...prev, res.data]);
      setNewUsername('');
      setNewUserPassword('');
    } else {
      setNewUserFormError(res.error || 'No se pudo crear el usuario.');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!activeAuthUrl || !userToChangePass) return;

    setChangePassError(null);
    setIsUpdatingPassword(true);

    const res = await updateDomainUrlUserPassword(
      domainName,
      activeAuthUrl.id,
      userToChangePass.username,
      newPasswordInput
    );
    setIsUpdatingPassword(false);

    if (res.ok) {
      setUserToChangePass(null);
      setNewPasswordInput('');
      setActionSuccess(`Contraseña de "${userToChangePass.username}" actualizada correctamente.`);
      setTimeout(() => setActionSuccess(null), 5000);
    } else {
      setChangePassError(res.error || 'No se pudo actualizar la contraseña.');
    }
  };

  const handleDeleteUrlUser = async () => {
    if (!activeAuthUrl || !userToDelete) return;

    setIsDeletingUser(true);
    const res = await deleteDomainUrlUser(domainName, activeAuthUrl.id, userToDelete.username);
    setIsDeletingUser(false);

    if (res.ok) {
      setUrlUsers((prev) => prev.filter((u) => u.username !== userToDelete.username));
      setUserToDelete(null);
    } else {
      alert(res.error || 'No se pudo eliminar el usuario.');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 MB';
    const mb = Number(bytes) / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatTtl = (seconds) => {
    const s = Number(seconds);
    if (s === 0) return '0s (sin caché)';
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${s}s (${(s / 60).toFixed(0)}m)`;
    if (s < 86400) return `${s}s (${(s / 3600).toFixed(1)}h)`;
    return `${s}s (${(s / 86400).toFixed(1)}d)`;
  };

  const totalAllocatedBytes = urls.reduce((acc, curr) => acc + (Number(curr.cacheSizeBytes) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-12">

      {/* Navegación y Encabezado */}
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
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <StatusBadge label="T-36: URLs" status="info" />
              <StatusBadge label="T-37: Caché & TTL" status="info" />
              <StatusBadge label="T-38: Auth por URL" status="info" />
              <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                Wildcards (*)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span className="font-mono text-indigo-300">{domainName}</span>
              <span className="text-slate-500 font-sans text-lg font-normal">— URLs y Caché</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure patrones de ruta, partición de memoria, políticas de reemplazo con TTL por archivo y credenciales de acceso.
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

      {/* Banner de estado de conexión */}
      {apiError && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs sm:text-sm space-y-1.5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-white">Estado de conexión con el backend:</span>
            <p className="text-amber-200/90 text-xs leading-relaxed">{apiError}</p>
          </div>
        </div>
      )}

      {/* Panel explicativo de las reglas de Wildcards y Políticas (Acordeón) */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowWildcardGuide(!showWildcardGuide)}
          className="w-full px-5 py-3.5 text-left text-xs sm:text-sm font-semibold text-slate-300 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <span>Especificaciones Técnicas: Wildcards, TTL y Políticas de Reemplazo (docs/modelo-datos.md)</span>
          </div>
          <span className="text-xs font-mono text-indigo-400">{showWildcardGuide ? 'Ocultar' : 'Ver especificaciones'}</span>
        </button>

        {showWildcardGuide && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-4 text-xs leading-relaxed text-slate-400">
            <div className="space-y-2">
              <p>
                <strong>Regla de Wildcards (*):</strong> El comodín <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded font-mono font-bold">*</code> coincide con cualquier secuencia de caracteres, incluida la vacía y barras inclinadas (<code className="text-slate-300 font-mono">/</code>). Gana el patrón <strong>más específico</strong> (más caracteres literales sin contar <code className="text-indigo-300 font-mono">*</code>).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Configuración de TTL por Tipo (fileTypes):</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Cada extensión se define en minúscula sin punto (ej: <code className="text-slate-200">html</code>, <code className="text-slate-200">css</code>, <code className="text-slate-200">png</code>). La clave especial <code className="text-amber-300 font-bold font-mono">*</code> es el fallback por defecto. Si <code className="text-amber-300 font-mono">*</code> no se define, las extensiones no listadas no se cachean y van directo al origen.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Políticas de Reemplazo Soportadas (policy):</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  <strong className="text-white">LRU:</strong> Menos recientemente usado • <strong className="text-white">LFU:</strong> Menos frecuentemente usado • <strong className="text-white">FIFO:</strong> Primero en entrar • <strong className="text-white">MRU:</strong> Más recientemente usado • <strong className="text-white">RANDOM:</strong> Aleatorio.
                </p>
              </div>
            </div>
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
              const fileTypesEntries = urlItem.fileTypes ? Object.entries(urlItem.fileTypes) : [];

              return (
                <div
                  key={urlItem.id || urlItem.pattern}
                  className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-slate-900/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

                          {/* Badge de autenticación (T-38) */}
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

                      {/* Botón T-38: Administrar Credenciales de autenticación */}
                      {authType === 'api_key' && (
                        <button
                          onClick={() => handleOpenApiKeysModal(urlItem)}
                          id={`manage-keys-${urlItem.id || idx}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-200 text-xs font-medium border border-amber-800/60 transition-all cursor-pointer"
                          title="Gestionar API Keys para esta URL"
                        >
                          <Key className="w-3.5 h-3.5 text-amber-400" />
                          <span>API Keys</span>
                        </button>
                      )}

                      {authType === 'user_password' && (
                        <button
                          onClick={() => handleOpenUrlUsersModal(urlItem)}
                          id={`manage-users-${urlItem.id || idx}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 text-xs font-medium border border-purple-800/60 transition-all cursor-pointer"
                          title="Gestionar Usuarios autorizados para esta URL"
                        >
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                          <span>Usuarios</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditModal(urlItem)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
                        title="Editar URL y Caché"
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

                  {/* Sección T-37: Chips de fileTypes con TTL y Políticas de reemplazo */}
                  <div className="pt-2 border-t border-slate-800/50 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mr-1">
                      <Sliders className="w-3 h-3 text-indigo-400" />
                      <span>Caché por tipo ({fileTypesEntries.length}):</span>
                    </span>
                    {fileTypesEntries.length > 0 ? (
                      fileTypesEntries.map(([ext, cfg]) => (
                        <span
                          key={ext}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
                          title={`Extensión: ${ext} | TTL: ${cfg.ttlSeconds}s | Política de reemplazo: ${cfg.policy}`}
                        >
                          <span className="text-indigo-300 font-bold">{ext === '*' ? '*' : `.${ext}`}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-emerald-300 font-medium">{formatTtl(cfg.ttlSeconds)}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-amber-300 font-bold bg-amber-950/40 px-1 rounded border border-amber-900/40">
                            {cfg.policy}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">
                        Sin tipos específicos configurados (sin regla "*" no se cachean extensiones)
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
       * Modal Crear / Editar URL (T-36 y T-37)
       * ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-2xl my-8 p-6 rounded-3xl glass-panel border border-slate-800 bg-surface-dark space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  {editingUrl ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingUrl ? 'Modificar URL y Configuración de Caché' : 'Nueva URL para el Dominio'}
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
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[10px] font-mono transition-colors cursor-pointer"
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
                    Tamaño de Caché Asignado (bytes) <span className="text-rose-400">*</span>
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

              {/* =========================================================================
               * T-37: Configuración de Caché por URL: fileTypes, TTL y Políticas de Reemplazo
               * ========================================================================= */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Configuración de Caché por URL (T-37: fileTypes)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Defina TTL en segundos y política de reemplazo por extensión. Use "*" como regla comodín general.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/60">
                    {Object.keys(formData.fileTypes || {}).length} tipos
                  </span>
                </div>

                {/* Sub-formulario para agregar una extensión */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Extensión:</label>
                    <input
                      type="text"
                      placeholder="html, css, js o *"
                      value={newFileType.ext}
                      onChange={(e) => setNewFileType({ ...newFileType, ext: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">TTL (segundos):</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="ej. 60, 3600"
                      value={newFileType.ttlSeconds}
                      onChange={(e) => setNewFileType({ ...newFileType, ttlSeconds: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Política (policy):</label>
                    <select
                      value={newFileType.policy}
                      onChange={(e) => setNewFileType({ ...newFileType, policy: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {ALLOWED_CACHE_POLICIES.map((pol) => (
                        <option key={pol} value={pol}>
                          {pol} ({CACHE_POLICY_DETAILS[pol]?.name || pol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddOrUpdateFileType}
                      className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      + Agregar Tipo
                    </button>
                  </div>
                </div>

                {fileTypeError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{fileTypeError}</span>
                  </p>
                )}

                {/* Accesos rápidos con presets estándar de docs/modelo-datos.md */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">Presets sugeridos:</span>
                  {COMMON_FILE_TYPES.map((preset) => (
                    <button
                      key={preset.ext}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[10px] font-mono transition-colors cursor-pointer"
                      title={`${preset.label}: ${preset.defaultTtl}s con ${preset.defaultPolicy}`}
                    >
                      {preset.ext === '*' ? '*' : `.${preset.ext}`} ({preset.defaultPolicy})
                    </button>
                  ))}
                </div>

                {/* Lista actual de fileTypes configurados */}
                <div className="pt-2">
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Tipos de Archivo Guardados en esta URL:
                  </span>

                  {Object.keys(formData.fileTypes || {}).length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-xl border border-slate-900 text-center">
                      No se han configurado tipos específicos. Recuerde que sin la regla comodín "*" las solicitudes no serán cacheadas.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {Object.entries(formData.fileTypes).map(([ext, cfg]) => (
                        <div
                          key={ext}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {ext === '*' ? '*' : `.${ext}`}
                            </span>
                            <span className="text-slate-400">
                              TTL: <strong className="text-emerald-300">{formatTtl(cfg.ttlSeconds)}</strong>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400">
                              Política: <strong className="text-amber-300">{cfg.policy}</strong>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFileType(ext)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                            title={`Eliminar regla para .${ext}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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

      {/* =========================================================================
       * Modal T-38: Administración de API Keys (auth.type === 'api_key')
       * ========================================================================= */}
      {isApiKeysModalOpen && activeAuthUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-2xl my-8 p-6 rounded-3xl glass-panel border border-amber-900/50 bg-surface-dark space-y-5 shadow-2xl">

            {/* Cabecera del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Administración de API Keys (T-38)
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span>{domainName}</span>
                    <span>•</span>
                    <span className="text-indigo-300 font-bold">{activeAuthUrl.pattern}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsApiKeysModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner de alerta de seguridad única si se acaba de crear una clave */}
            {createdRawKey && (
              <div className="p-4 rounded-2xl bg-amber-950/70 border-2 border-amber-500/80 text-amber-200 space-y-2.5 animate-fadeIn">
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Clave Creada — Guarde su API Key ahora</span>
                </div>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  Por diseño de seguridad estricto (docs/modelo-datos.md sección 3.5), el sistema almacena únicamente el hash SHA-256.
                  <strong> Esta es la única vez que la clave en claro será visible.</strong> Cópiela y resérvela en un lugar seguro.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={createdRawKey}
                    className="w-full px-3 py-2 rounded-xl bg-black/70 border border-amber-800 font-mono text-xs text-amber-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyRawKey}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all cursor-pointer shrink-0"
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Copiada' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Formulario para generar una nueva API Key */}
            <form onSubmit={handleCreateApiKey} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                Generar Nueva API Key
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nombre descriptivo (ej: Postman Dev, Servidor de Pagos)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  disabled={isCreatingKey}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isCreatingKey || !newKeyName.trim()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isCreatingKey ? 'Generando...' : 'Generar Clave'}</span>
                </button>
              </div>

              {newKeyFormError && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{newKeyFormError}</span>
                </p>
              )}
            </form>

            {/* Lista de API Keys existentes para esta URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Claves autorizadas para el encabezado <code className="text-amber-300 font-mono">x-api-key</code>:</span>
                <span className="font-mono">{apiKeys.length} keys</span>
              </div>

              {loadingApiKeys ? (
                <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  Cargando API keys...
                </div>
              ) : apiKeysError ? (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs text-amber-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>Aviso del backend:</span>
                  </div>
                  <p>{apiKeysError}</p>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-950/40 border border-slate-900 text-slate-500 text-xs">
                  No hay API keys registradas para esta URL. Genere una clave arriba para permitir el acceso.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
                  {apiKeys.map((k) => (
                    <div key={k.id || k.prefix} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{k.name}</span>
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-800">
                            {k.prefix}...
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Creada: {new Date(k.createdAt || Date.now()).toLocaleString()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setKeyToDelete(k)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Eliminar API Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmación para eliminar clave */}
            {keyToDelete && (
              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-900 text-xs text-rose-200 flex items-center justify-between gap-3 animate-fadeIn">
                <span>¿Revocar la API key <strong>"{keyToDelete.name}"</strong> ({keyToDelete.prefix}...)?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setKeyToDelete(null)}
                    disabled={isDeletingKey}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteApiKey}
                    disabled={isDeletingKey}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    {isDeletingKey ? 'Revocando...' : 'Sí, revocar'}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsApiKeysModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
       * Modal T-38: Administración de Usuarios y Claves (auth.type === 'user_password')
       * ========================================================================= */}
      {isUsersModalOpen && activeAuthUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-2xl my-8 p-6 rounded-3xl glass-panel border border-purple-900/50 bg-surface-dark space-y-5 shadow-2xl">

            {/* Cabecera del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Usuarios Autorizados por URL (T-38)
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span>{domainName}</span>
                    <span>•</span>
                    <span className="text-indigo-300 font-bold">{activeAuthUrl.pattern}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUsersModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-900/60 text-xs text-purple-200/90 leading-relaxed">
              Los usuarios configurados en esta URL son independientes de las personas administradoras de la plataforma (docs/modelo-datos.md sección 3.4). Las contraseñas se almacenan mediante hash seguro (bcrypt) y otorgan acceso a través de la cookie de sesión <code className="text-purple-300 font-mono">zc_session</code>.
            </div>

            {/* Formulario para registrar un nuevo usuario */}
            <form onSubmit={handleCreateUrlUser} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                Registrar Usuario para esta URL
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Nombre de Usuario:</label>
                  <input
                    type="text"
                    placeholder="ej. ana, operador_qa"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    disabled={isCreatingUser}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Contraseña Inicial:</label>
                  <div className="relative">
                    <input
                      type={showNewUserPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      disabled={isCreatingUser}
                      className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showNewUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {newUserFormError && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{newUserFormError}</span>
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isCreatingUser || !newUsername.trim() || !newUserPassword}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isCreatingUser ? 'Creando...' : 'Crear Usuario'}</span>
                </button>
              </div>
            </form>

            {/* Formulario submodal para cambiar contraseña */}
            {userToChangePass && (
              <form onSubmit={handleUpdatePassword} className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-800 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cambiar Contraseña para "{userToChangePass.username}"</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setUserToChangePass(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showChangePass ? 'text' : 'password'}
                      placeholder="Nueva contraseña (mínimo 6 caracteres)"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      disabled={isUpdatingPassword}
                      className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChangePass(!showChangePass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showChangePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingPassword || !newPasswordInput}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingPassword ? 'Actualizando...' : 'Actualizar'}
                  </button>
                </div>

                {changePassError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{changePassError}</span>
                  </p>
                )}
              </form>
            )}

            {/* Lista de Usuarios autorizados existentes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Usuarios con credencial activa:</span>
                <span className="font-mono">{urlUsers.length} usuarios</span>
              </div>

              {loadingUsers ? (
                <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  Cargando usuarios...
                </div>
              ) : usersError ? (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs text-amber-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>Aviso del backend:</span>
                  </div>
                  <p>{usersError}</p>
                </div>
              ) : urlUsers.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-950/40 border border-slate-900 text-slate-500 text-xs">
                  No hay usuarios registrados para esta URL.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
                  {urlUsers.map((u) => (
                    <div key={u.username} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold font-mono text-purple-300 text-sm">
                          {u.username}
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Creado: {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setUserToChangePass(u);
                            setNewPasswordInput('');
                            setChangePassError(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors cursor-pointer"
                        >
                          Cambiar Contraseña
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserToDelete(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmación para eliminar usuario */}
            {userToDelete && (
              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-900 text-xs text-rose-200 flex items-center justify-between gap-3 animate-fadeIn">
                <span>¿Eliminar al usuario <strong>"{userToDelete.username}"</strong> de esta URL?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    disabled={isDeletingUser}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteUrlUser}
                    disabled={isDeletingUser}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    {isDeletingUser ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsUsersModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
       * Modal de Confirmación para Eliminar URL (T-36)
       * ========================================================================= */}
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
