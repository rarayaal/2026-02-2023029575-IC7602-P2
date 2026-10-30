import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, 
  Layers, 
  Shield, 
  Plus, 
  ArrowRight, 
  AlertCircle,
  Activity,
  CheckCircle2,
  Lock,
  Server
} from 'lucide-react';
import { config } from '../utils/config';
import apiClient from '../services/apiClient';

export default function HomePage() {
  const [testResult, setTestResult] = useState(null);
  const [testingClient, setTestingClient] = useState(false);

  const handleTestClient = async () => {
    setTestingClient(true);
    setTestResult(null);

    try {
      const res = await apiClient.get('/health');
      setTestResult(res);
    } catch (err) {
      setTestResult({
        ok: false,
        status: 0,
        data: null,
        error: err.message,
        isConfigError: true,
      });
    } finally {
      setTestingClient(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Encabezado Principal del Panel */}
      <div className="bg-surface border border-surface-border rounded-lg p-6 sm:p-7 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              Panel de Control
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1">
              Administración de dominios, reglas de enrutamiento y control de acceso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/dominios/nuevo"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-forest hover:bg-forest-hover text-white text-xs sm:text-sm font-medium transition-colors shadow-subtle cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Dominio</span>
            </Link>

            <Link
              to="/dominios"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-surface hover:bg-surface-subtle text-ink text-xs sm:text-sm font-medium border border-surface-border transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-forest" />
              <span>Mis Dominios</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Módulos Operativos Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Módulo 1: Dominios */}
        <div className="bg-surface p-5 rounded-lg border border-surface-border space-y-3 shadow-card flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded bg-surface-subtle border border-surface-border flex items-center justify-center text-forest">
              <Globe className="w-4 h-4" />
            </div>
            <h2 className="font-serif font-bold text-ink text-base">Dominios y Orígenes</h2>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Configuración de servidores de origen, puertos, cuota de almacenamiento y validación de propiedad por DNS TXT.
            </p>
          </div>

          <div className="pt-2 border-t border-surface-border flex items-center justify-between">
            <Link 
              to="/dominios" 
              className="text-xs font-semibold text-forest hover:underline flex items-center gap-1"
            >
              <span>Ver dominios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link 
              to="/dominios/nuevo" 
              className="text-xs text-ink-muted hover:text-ink font-medium"
            >
              + Nuevo
            </Link>
          </div>
        </div>

        {/* Módulo 2: URLs y Caché */}
        <div className="bg-surface p-5 rounded-lg border border-surface-border space-y-3 shadow-card flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded bg-surface-subtle border border-surface-border flex items-center justify-center text-forest">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="font-serif font-bold text-ink text-base">Reglas de Ruta y Caché</h2>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Patrones con comodines (*), jerarquía por especificidad, TTL por tipo de archivo y políticas de reemplazo.
            </p>
          </div>

          <div className="pt-2 border-t border-surface-border">
            <Link 
              to="/dominios" 
              className="text-xs font-semibold text-forest hover:underline flex items-center gap-1"
            >
              <span>Configurar en mis dominios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Módulo 3: Acceso y Seguridad */}
        <div className="bg-surface p-5 rounded-lg border border-surface-border space-y-3 shadow-card flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded bg-surface-subtle border border-surface-border flex items-center justify-center text-forest">
              <Shield className="w-4 h-4" />
            </div>
            <h2 className="font-serif font-bold text-ink text-base">Control de Acceso</h2>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Protección de rutas mediante API Keys (x-api-key) o autenticación por usuario y contraseña.
            </p>
          </div>

          <div className="pt-2 border-t border-surface-border flex items-center justify-between">
            <Link 
              to="/cache-login" 
              className="text-xs font-semibold text-forest hover:underline flex items-center gap-1"
            >
              <span>Acceso a caché</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link 
              to="/login" 
              className="text-xs text-ink-muted hover:text-ink font-medium"
            >
              Sesión de admin
            </Link>
          </div>
        </div>

      </div>

      {/* Estado del Sistema Operativo */}
      <div className="bg-surface p-6 rounded-lg border border-surface-border space-y-4 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
          <div>
            <h2 className="font-serif text-base font-bold text-ink flex items-center gap-2">
              <Activity className="w-4 h-4 text-forest" />
              <span>Estado del Servicio</span>
            </h2>
            <p className="text-xs text-ink-secondary mt-0.5">
              Conexión con los servicios de backend y autenticación
            </p>
          </div>

          <button
            onClick={handleTestClient}
            disabled={testingClient}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-surface hover:bg-surface-subtle text-ink font-medium text-xs border border-surface-border transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <Server className="w-3.5 h-3.5 text-forest" />
            <span>{testingClient ? 'Comprobando...' : 'Probar conexión (/api/health)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-surface-subtle border border-surface-border space-y-1">
            <span className="text-ink-muted block font-medium">Servidor API:</span>
            {testResult?.ok ? (
              <span className="text-forest font-mono font-medium truncate block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest inline shrink-0" />
                <span>En línea ({config.apiBaseUrl})</span>
              </span>
            ) : testResult && !testResult.ok ? (
              <span className="text-amberState font-mono font-medium truncate block flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amberState inline shrink-0" />
                <span>Sin conexión ({config.apiBaseUrl})</span>
              </span>
            ) : config.isApiConfigured ? (
              <span className="text-ink font-mono font-medium truncate block">
                Configurado ({config.apiBaseUrl})
              </span>
            ) : (
              <span className="text-amberState font-medium block">
                No configurado
              </span>
            )}
          </div>

          <div className="p-3 rounded bg-surface-subtle border border-surface-border space-y-1">
            <span className="text-ink-muted block font-medium">Servicio de Autenticación:</span>
            <span className="text-forest font-medium block">
              {config.isFirebaseConfigured ? 'Configurado' : 'Disponible'}
            </span>
          </div>

          <div className="p-3 rounded bg-surface-subtle border border-surface-border space-y-1">
            <span className="text-ink-muted block font-medium">Entorno:</span>
            <span className="text-ink font-mono font-medium block">
              {config.appEnv || 'development'} (puerto :{config.uiPort || (typeof window !== 'undefined' && window.location.port ? window.location.port : '5173')})
            </span>
          </div>
        </div>

        {/* Resultado de la comprobación del API */}
        {testResult && (
          <div className={`mt-3 p-3.5 rounded border text-xs leading-relaxed ${
            testResult.ok 
              ? 'bg-forest/10 border-forest/30 text-forest' 
              : 'bg-amberState-subtle border-amberState-border text-amberState'
          }`}>
            <div className="font-semibold text-xs mb-1 flex items-center gap-1.5">
              {testResult.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-forest shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amberState shrink-0" />
              )}
              <span className={testResult.ok ? 'text-forest font-bold' : 'text-amberState font-bold'}>
                {testResult.ok ? 'Conexión exitosa con el backend' : 'Respuesta del servidor:'}
              </span>
            </div>
            <p className="text-ink-secondary">
              {testResult.ok
                ? 'El servicio backend (/api/health) respondió correctamente (HTTP 200 OK).'
                : testResult.isConfigError
                ? 'El cliente HTTP no tiene configurada la variable de URL del API.'
                : 'Respuesta de /health:'}
            </p>
            <pre className="mt-2 p-2.5 rounded bg-white border border-surface-border font-mono text-ink text-[11px] overflow-x-auto">
              {testResult.error || JSON.stringify(testResult.data || testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}
