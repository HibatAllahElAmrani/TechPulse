import { Outlet, Link } from 'react-router-dom';
import { Activity, Github } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-accent" />
            <span className="text-xl font-bold">OSS Pulse</span>
            <span className="text-xs text-gray-500 ml-2">MVP</span>
          </Link>
          <nav className="flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost flex items-center gap-2"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border py-4 text-center text-sm text-gray-500">
        OSS Pulse — Projet de Fin d'Année · Aseds 2025
      </footer>
    </div>
  );
}
