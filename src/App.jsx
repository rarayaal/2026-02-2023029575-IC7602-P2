import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterAccountPage from './pages/RegisterAccountPage';
import RegisterDomainPage from './pages/RegisterDomainPage';
import DomainsListPage from './pages/DomainsListPage';
import DomainUrlsPage from './pages/DomainUrlsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="registro" element={<RegisterAccountPage />} />
          <Route path="register" element={<RegisterAccountPage />} />
          <Route path="dominios" element={<DomainsListPage />} />
          <Route path="domains" element={<DomainsListPage />} />
          <Route path="dominios/nuevo" element={<RegisterDomainPage />} />
          <Route path="domains/new" element={<RegisterDomainPage />} />
          <Route path="dominios/:domain/urls" element={<DomainUrlsPage />} />
          <Route path="domains/:domain/urls" element={<DomainUrlsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

