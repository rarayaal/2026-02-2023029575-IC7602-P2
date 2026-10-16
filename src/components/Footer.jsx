import React from 'react';
import { Cpu, CheckCircle2 } from 'lucide-react';
import { PROJECT_METADATA } from '../utils/constants';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-surface-dark/90 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
          
          <div>
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm mb-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>{PROJECT_METADATA.course}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {PROJECT_METADATA.projectName} · {PROJECT_METADATA.semester}.
            </p>
            <div className="mt-2 text-slate-500">
              {PROJECT_METADATA.institution}
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-200 mb-2">Responsabilidad del Componente</div>
            <ul className="space-y-1 text-slate-400">
              <li>• <strong className="text-slate-300">{PROJECT_METADATA.task.responsible}</strong> ({PROJECT_METADATA.task.studentId})</li>
              <li>• Tarea: <span className="text-indigo-300 font-mono">{PROJECT_METADATA.task.id}</span> — {PROJECT_METADATA.task.name}</li>
              <li>• Estado: <span className="text-emerald-400 font-semibold">{PROJECT_METADATA.task.status}</span></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-slate-200 mb-2">Stack y Despliegue</div>
            <p className="text-slate-400 leading-relaxed">
              Construido con React 18, Vite 5 y Tailwind CSS 3. Preparado para Vercel (SPA rewrites) y Docker Compose multi-stage.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Despliegue Vercel & Docker Operativo</span>
            </div>
          </div>

        </div>

        <div className="mt-6 pt-6 border-t border-slate-900 text-center text-[11px] text-slate-500">
          Instituto Tecnológico de Costa Rica · Escuela de Computación · Redes 2026
        </div>
      </div>
    </footer>
  );
}
