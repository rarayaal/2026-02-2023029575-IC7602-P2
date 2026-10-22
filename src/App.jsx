import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterAccountPage from './pages/RegisterAccountPage';
import RegisterDomainPage from './pages/RegisterDomainPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="registro" element={<RegisterAccountPage />} />
          <Route path="register" element={<RegisterAccountPage />} />
          <Route path="dominios/nuevo" element={<RegisterDomainPage />} />
          <Route path="domains/new" element={<RegisterDomainPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
