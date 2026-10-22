import { useMemo } from 'react';
import { config } from '../utils/config';
import { PROJECT_METADATA } from '../utils/constants';

/**
 * Hook para acceder a la configuración global y metadatos de la aplicación de manera reactiva.
 */
export function useAppConfig() {
  return useMemo(() => ({
    ...config,
    project: PROJECT_METADATA,
  }), []);
}

export default useAppConfig;
