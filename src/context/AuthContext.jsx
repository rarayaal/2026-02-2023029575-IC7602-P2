/**
 * Contexto de Autenticación de Firebase para la plataforma (T-33 a T-38).
 * Administra el estado global de la sesión, la obtención del ID token y la sincronización del perfil.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  isFirebaseConfigured,
  getIdToken,
  loginWithEmailAndPassword,
  logoutUser,
} from '../services/firebase';
import { registerAccount, getUserProfile } from '../services/authService';

const AuthContext = createContext({
  currentUser: null,
  userProfile: null,
  loading: true,
  isConfigured: false,
  login: async () => ({ ok: false, error: 'Auth not initialized' }),
  register: async () => ({ ok: false, error: 'Auth not initialized' }),
  logout: async () => ({ ok: true, error: null }),
  refreshProfile: async () => null,
  getIdToken: async () => null,
});

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carga o actualiza el perfil del usuario desde el endpoint de backend GET /api/users/me
  const refreshProfile = useCallback(async () => {
    if (!auth?.currentUser) {
      setUserProfile(null);
      return null;
    }
    const res = await getUserProfile();
    if (res.ok && res.data) {
      setUserProfile(res.data);
      return res.data;
    }
    return null;
  }, []);

  // Suscripción al observador de estado de autenticación de Firebase
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Intenta obtener el perfil desde Firestore mediante el API
        try {
          const res = await getUserProfile();
          if (res.ok && res.data) {
            setUserProfile(res.data);
          } else {
            // Fallback con los metadatos de Firebase si el backend aún no sincroniza
            setUserProfile({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
            });
          }
        } catch {
          setUserProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Escuchar eventos de sesión revocada o 401 no recuperable del cliente HTTP
    const handleUnauthorized = () => {
      console.warn('[AUTH] Evento api:unauthorized recibido. La sesión de Firebase expiró.');
    };
    window.addEventListener('api:unauthorized', handleUnauthorized);

    return () => {
      unsubscribe();
      window.removeEventListener('api:unauthorized', handleUnauthorized);
    };
  }, []);

  /**
   * Inicia sesión con Firebase Authentication
   */
  const login = async (email, password) => {
    setLoading(true);
    const result = await loginWithEmailAndPassword(email, password);
    if (result.ok && result.user) {
      setCurrentUser(result.user);
      await refreshProfile();
    }
    setLoading(false);
    return result;
  };

  /**
   * Registra una nueva cuenta de usuario:
   * 1. Llama a POST /users en el backend (crea usuario en Firebase Admin y perfil en Firestore)
   * 2. Si es exitoso, inicia sesión mediante Firebase Web SDK con las mismas credenciales
   */
  const register = async (displayName, email, password) => {
    setLoading(true);

    // Paso 1: Registrar en el backend
    const apiResult = await registerAccount({ displayName, email, password });
    if (!apiResult.ok) {
      setLoading(false);
      return {
        ok: false,
        status: apiResult.status,
        code: apiResult.code,
        error: apiResult.error,
        user: null,
      };
    }

    // Paso 2: Si Firebase Web SDK está configurado, iniciar sesión automáticamente
    if (isFirebaseConfigured && auth) {
      const loginResult = await loginWithEmailAndPassword(email, password);
      setLoading(false);

      if (!loginResult.ok) {
        return {
          ok: true, // La cuenta sí fue creada exitosamente en el backend
          autoLoginError: loginResult.error,
          user: null,
          data: apiResult.data,
        };
      }

      setCurrentUser(loginResult.user);
      await refreshProfile();

      return {
        ok: true,
        user: loginResult.user,
        data: apiResult.data,
        error: null,
      };
    }

    setLoading(false);
    return {
      ok: true,
      user: null,
      data: apiResult.data,
      note: 'Cuenta creada. Para iniciar sesión automática, configure las credenciales de Firebase en el frontend.',
    };
  };

  /**
   * Cierra la sesión activa
   */
  const logout = async () => {
    setLoading(true);
    const result = await logoutUser();
    setCurrentUser(null);
    setUserProfile(null);
    setLoading(false);
    return result;
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    isConfigured: isFirebaseConfigured,
    login,
    register,
    logout,
    refreshProfile,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}

export default AuthContext;
