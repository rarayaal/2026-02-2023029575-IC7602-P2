import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import CacheLoginPage from './pages/CacheLoginPage';
import RegisterAccountPage from './pages/RegisterAccountPage';
import RegisterDomainPage from './pages/RegisterDomainPage';
import DomainsListPage from './pages/DomainsListPage';
import DomainUrlsPage from './pages/DomainUrlsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            {/* Rutas Públicas */}
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="iniciar-sesion" element={<LoginPage />} />
            <Route path="cache-login" element={<CacheLoginPage />} />
            <Route path="cache-auth" element={<CacheLoginPage />} />
            <Route path="sesion" element={<CacheLoginPage />} />
            <Route path="session" element={<CacheLoginPage />} />
            <Route path="registro" element={<RegisterAccountPage />} />
            <Route path="register" element={<RegisterAccountPage />} />

            {/* Rutas Privadas / Protegidas por Autenticación Firebase */}
            <Route
              path="dominios"
              element={
                <ProtectedRoute>
                  <DomainsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="domains"
              element={
                <ProtectedRoute>
                  <DomainsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="dominios/nuevo"
              element={
                <ProtectedRoute>
                  <RegisterDomainPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="domains/new"
              element={
                <ProtectedRoute>
                  <RegisterDomainPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="dominios/:domain/urls"
              element={
                <ProtectedRoute>
                  <DomainUrlsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="domains/:domain/urls"
              element={
                <ProtectedRoute>
                  <DomainUrlsPage />
                </ProtectedRoute>
              }
            />

            {/* Ruta 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}


